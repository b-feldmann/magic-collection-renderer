import React from 'react';
import { Select } from 'antd';
import { getReminder, READ_AHEAD, REMINDER_WITHOUT_SACRIFICE } from '../../utils/sagaChapters';
import styles from './styles.module.scss';

export type ReminderKind = 'standard' | 'read-ahead' | 'no-sacrifice' | 'custom';

const REMINDER_OPTIONS: { value: ReminderKind; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'read-ahead', label: 'Read ahead' },
  { value: 'no-sacrifice', label: 'Without sacrifice' },
  { value: 'custom', label: 'Custom' },
];

export const getReminderKind = (reminder: string): ReminderKind => {
  const text = reminder.trim();
  if (!text) return 'standard';
  if (text === READ_AHEAD) return 'read-ahead';
  if (text === REMINDER_WITHOUT_SACRIFICE) return 'no-sacrifice';
  return 'custom';
};

const getReminderText = (kind: ReminderKind, chapters: number[]): string => {
  switch (kind) {
    case 'read-ahead':
      return READ_AHEAD;
    case 'no-sacrifice':
      return REMINDER_WITHOUT_SACRIFICE;
    case 'custom':
      // The standard text to start from.
      return getReminder(chapters).replace(/_/g, '');
    default:
      return '';
  }
};

interface SagaReminderSelectProps {
  id: string;
  kind: ReminderKind;
  chapters: number[];
  /** Gets the text to put above the chapters. */
  onSelect: (reminder: string, kind: ReminderKind) => void;
  className?: string;
}

/** Picks the reminder text of a Saga. */
const SagaReminderSelect = ({
  id,
  kind,
  chapters,
  onSelect,
  className = '',
}: SagaReminderSelectProps) => (
  <div className={`${styles.sagaReminderField} ${className}`}>
    <label htmlFor={id}>Reminder text</label>
    <Select<ReminderKind>
      id={id}
      size="small"
      value={kind}
      options={REMINDER_OPTIONS}
      onChange={next => onSelect(getReminderText(next, chapters), next)}
    />
  </div>
);

export default SagaReminderSelect;
