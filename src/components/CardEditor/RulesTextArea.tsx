import React, {
  Ref,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Input } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { TokenCardsContext } from '../../store';
import { findOpenTokenReference } from '../../utils/tokenReferences';
import TokenReferenceOptions, {
  getTokenReferenceOptions,
  TokenReferenceOption,
  tokenReferenceOptionId,
} from './TokenReferenceOptions';
import styles from './styles.module.scss';

export interface RulesTextAreaHandle {
  /** Replaces the selection. */
  insert: (text: string) => void;
  /** Puts the caret there once the next value is rendered. */
  setPendingCaret: (position: number) => void;
  focus: () => void;
}

interface RulesTextAreaProps {
  id: string;
  value: string;
  onChange: (text: string, caret: number) => void;
  ref?: Ref<RulesTextAreaHandle>;
  className?: string;
  placeholder?: string;
  minRows?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onFocus?: () => void;
  /** What Enter inserts, by default a line break. */
  enterText?: string;
}

/** A field for rules text, which completes "[Token: …]" references. */
const RulesTextArea = ({
  id,
  value,
  onChange,
  ref,
  className = '',
  placeholder,
  minRows = 2,
  onFocus,
  enterText,
  ...ariaProps
}: RulesTextAreaProps) => {
  const textareaRef = useRef<TextAreaRef>(null);
  const pendingCaret = useRef<number | null>(null);
  const tokenCards = useContext(TokenCardsContext);
  const listId = `${id}-token-cards`;

  // The caret while the text has focus, for the token reference autocomplete.
  const [caret, setCaret] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // The start of the reference whose list was closed with Escape.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const openReference = caret === null ? null : findOpenTokenReference(value, caret);
  const options = useMemo(
    () => (openReference ? getTokenReferenceOptions(openReference.query, tokenCards) : []),
    [openReference?.query, tokenCards], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const listOpen = !!openReference && options.length > 0 && dismissedAt !== openReference.start;
  const active = Math.min(activeIndex, options.length - 1);

  const getTextarea = () => textareaRef.current?.resizableTextArea?.textArea;

  // Apply once after a controlled update, including replacing a symbol with
  // itself (where the text is unchanged but the selection must still collapse).
  useLayoutEffect(() => {
    const textarea = getTextarea();
    if (!textarea || pendingCaret.current === null) return;
    textarea.focus();
    textarea.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  const replaceText = (start: number, end: number, insert: string) => {
    pendingCaret.current = start + insert.length;
    setCaret(start + insert.length);
    setActiveIndex(0);
    onChange(value.slice(0, start) + insert + value.slice(end), start + insert.length);
  };

  const insertText = (text: string) => {
    const textarea = getTextarea();
    if (textarea) replaceText(textarea.selectionStart, textarea.selectionEnd, text);
  };

  useImperativeHandle(ref, () => ({
    insert: insertText,
    setPendingCaret: position => {
      pendingCaret.current = position;
    },
    focus: () => getTextarea()?.focus(),
  }));

  const selectOption = (option: TokenReferenceOption) => {
    if (!openReference) return;
    replaceText(openReference.start, openReference.end, `[Token: ${option.reference}]`);
  };

  const updateCaret = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd } = event.currentTarget;
    setCaret(selectionStart === selectionEnd ? selectionStart : null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!listOpen) {
      if (
        enterText !== undefined &&
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        insertText(enterText);
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((active + step + options.length) % options.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectOption(options[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setDismissedAt(openReference!.start);
    }
  };

  return (
    <div className={styles.rulesTextField}>
      <Input.TextArea
        ref={textareaRef}
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        {...ariaProps}
        aria-autocomplete="list"
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={listOpen ? tokenReferenceOptionId(listId, active) : undefined}
        onChange={event => {
          updateCaret(event);
          onChange(event.target.value, event.target.selectionEnd);
        }}
        onFocus={onFocus}
        onSelect={updateCaret}
        onKeyDown={onKeyDown}
        onBlur={() => setCaret(null)}
        autoSize={{ minRows }}
      />
      {listOpen && (
        <TokenReferenceOptions
          id={listId}
          options={options}
          activeIndex={active}
          onSelect={selectOption}
        />
      )}
    </div>
  );
};

export default RulesTextArea;
