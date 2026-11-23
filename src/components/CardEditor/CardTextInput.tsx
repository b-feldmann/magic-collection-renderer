import React, { useRef, useState } from 'react';
import { ColorType } from '../../interfaces/enums';
import {
  addChapter,
  getChapters,
  getTypedReminder,
  parseSagaDraft,
  replaceReminder,
} from '../../utils/sagaChapters';
import RulesTextArea, { RulesTextAreaHandle } from './RulesTextArea';
import SagaReminderSelect, { getReminderKind, ReminderKind } from './SagaReminderSelect';
import SymbolToolbar, { ToolbarButton } from './SymbolToolbar';
import styles from './styles.module.scss';

interface CardTextInputProps {
  id: string;
  name: string;
  value: string[];
  onChange: (lines: string[]) => void;
  manaColors?: ColorType[];
  /** The text of a Saga, whose abilities belong to chapters (see sagaChapters). */
  chapters?: boolean;
  /** Shown next to the label. */
  labelAction?: React.ReactNode;
}

const CardTextInput = ({
  id,
  name,
  value,
  onChange,
  manaColors,
  chapters = false,
  labelAction,
}: CardTextInputProps) => {
  const textRef = useRef<RulesTextAreaHandle>(null);

  const insertChapter = () => {
    const { lines, index } = addChapter(value);
    textRef.current?.setPendingCaret(lines.slice(0, index + 1).join('\n').length);
    onChange(lines);
  };

  // Choosing a custom reminder text writes out the standard one, to be changed. Otherwise the
  // standard text counts as such, even written out.
  const [customReminder, setCustomReminder] = useState('');
  const typedReminder = chapters ? getTypedReminder(value) : '';
  const isCustomReminder = typedReminder !== '' && typedReminder === customReminder;
  const reminderKind = isCustomReminder
    ? 'custom'
    : getReminderKind(chapters ? parseSagaDraft(value, false).reminder : '');
  const selectReminder = (reminder: string, kind: ReminderKind) => {
    setCustomReminder(kind === 'custom' ? reminder : '');
    if (kind === 'custom') textRef.current?.setPendingCaret(reminder.length);
    onChange(replaceReminder(value, reminder));
  };

  return (
    <span>
      <div className={styles.rulesLabelRow}>
        <label className={styles.label} htmlFor={id}>
          {name}
        </label>
        {labelAction}
      </div>
      <SymbolToolbar
        name={name}
        controls={id}
        manaColors={manaColors}
        onInsert={text => textRef.current?.insert(text)}
      >
        {chapters && (
          <ToolbarButton controls={id} title="Add the next chapter" onClick={insertChapter}>
            Chapter
          </ToolbarButton>
        )}
      </SymbolToolbar>
      {chapters && (
        <SagaReminderSelect
          id={`${id}-reminder-kind`}
          className={styles.sagaReminderBar}
          kind={reminderKind}
          chapters={getChapters(value)}
          onSelect={selectReminder}
        />
      )}
      <RulesTextArea
        ref={textRef}
        id={id}
        className={styles.rulesTextArea}
        value={value.join('\n')}
        onChange={text => onChange(text.split('\n'))}
        aria-describedby={chapters ? `${id}-chapters` : undefined}
      />
      {chapters && (
        <p id={`${id}-chapters`} className={styles.fieldHint}>
          Start an ability with its chapter, e.g. “I — ”, or “I, II — ” if several share it. A line
          without a chapter is a step of its own; on a creature, lines after the last chapter go
          below the type line.
        </p>
      )}
    </span>
  );
};

export default CardTextInput;
