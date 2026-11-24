import { useLayoutEffect, useRef } from 'react';
import type { RulesTextAreaHandle } from './RulesTextArea';

let lastStepId = 0;

/** Keeps a step's field (and the caret in it) when steps move. */
export const newStepId = () => {
  lastStepId += 1;
  return lastStepId;
};

/** The text fields of a step editor, whose symbol buttons insert into the one focused last. */
const useStepFields = () => {
  const fields = useRef(new Map<string, RulesTextAreaHandle>());
  const lastField = useRef<string | null>(null);
  const pendingFocus = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    fields.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  return {
    fieldProps: (key: string | number) => ({
      ref: (handle: RulesTextAreaHandle | null) => {
        if (handle) fields.current.set(String(key), handle);
        else fields.current.delete(String(key));
      },
      onFocus: () => {
        lastField.current = String(key);
      },
    }),
    insert: (symbol: string, defaultKey: string | number | undefined) => {
      const key =
        lastField.current !== null && fields.current.has(lastField.current)
          ? lastField.current
          : String(defaultKey);
      fields.current.get(key)?.insert(symbol);
    },
    focus: (key: string | number) => fields.current.get(String(key))?.focus(),
    /** Focuses a field once it is rendered. */
    focusNext: (key: string | number) => {
      pendingFocus.current = String(key);
    },
  };
};

export default useStepFields;
