import React, { useState } from 'react';
import { Button } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ColorType } from '../../interfaces/enums';
import {
  chapterPrefix,
  formatSagaDraft,
  isReminderLine,
  MAX_CHAPTERS,
  numberChapters,
  parseChapterLine,
  parseSagaDraft,
  SagaDraft,
  SagaDraftStep,
  toRomanNumeral,
} from '../../utils/sagaChapters';
import RulesTextArea from './RulesTextArea';
import SagaReminderSelect, { getReminderKind } from './SagaReminderSelect';
import StepButton from './StepButton';
import SymbolToolbar from './SymbolToolbar';
import styles from './styles.module.scss';
import useStepFields, { newStepId } from './useStepFields';

interface DraftStep extends SagaDraftStep {
  id: number;
}

interface Draft extends SagaDraft {
  steps: DraftStep[];
}

interface DraftState extends Draft {
  // What the draft was read from or last written as. Other text replaces the draft.
  source: string;
}

interface SagaStepsInputProps {
  id: string;
  name: string;
  value: string[];
  onChange: (lines: string[]) => void;
  /** Whether the Saga has a rules box below its type line. */
  isCreature: boolean;
  /** Identifies the card face, whose draft may hold steps that are still empty. */
  documentKey: string;
  manaColors?: ColorType[];
  labelAction?: React.ReactNode;
}

const RULES_FIELD = 'rules';
const REMINDER_FIELD = 'reminder';

/** Edits a Saga's card text step by step. Chapters are numbered by their order. */
const SagaStepsInput = ({
  id,
  name,
  value,
  onChange,
  isCreature,
  documentKey,
  manaColors,
  labelAction,
}: SagaStepsInputProps) => {
  const text = value.join('\n');
  const source = JSON.stringify([documentKey, isCreature, text]);

  const readDraft = (lines: string[], previous: DraftStep[] = []): Draft => {
    const draft = parseSagaDraft(lines, isCreature);
    return {
      ...draft,
      steps: draft.steps.map((step, i) => ({ ...step, id: previous[i]?.id ?? newStepId() })),
    };
  };

  const [state, setState] = useState<DraftState>(() => ({ ...readDraft(value), source }));
  let draft = state;
  if (state.source !== source) {
    draft = { ...readDraft(value, state.steps), source };
    setState(draft);
  }
  const { steps, reminder, rules } = draft;

  const update = (next: Draft) => {
    const lines = formatSagaDraft(next);
    setState({ ...next, source: JSON.stringify([documentKey, isCreature, lines.join('\n')]) });
    onChange(lines);
  };

  const chapters = numberChapters(steps);
  const chapterTotal = steps.reduce((sum, step) => sum + step.chapterCount, 0);

  const fields = useStepFields();

  // On a creature, text after the last chapter belongs to the rules box.
  const settle = (next: Draft): Draft => {
    if (!isCreature) return next;
    const last = next.steps.reduce((after, step, i) => (step.chapterCount ? i + 1 : after), 0);
    const moved = next.steps.slice(last).map(step => step.text);
    return {
      ...next,
      steps: next.steps.slice(0, last),
      rules: [...moved, next.rules].filter(part => part.trim()).join('\n'),
    };
  };

  const updateStep = (index: number, changes: Partial<SagaDraftStep>) =>
    update({
      ...draft,
      steps: steps.map((step, i) => (i === index ? { ...step, ...changes } : step)),
    });

  const changeStepText = (index: number, nextText: string) => {
    const step = steps[index];
    const lines = nextText.split('\n');
    const pastedChapters =
      lines.length > step.text.split('\n').length && lines.some(line => parseChapterLine(line));
    if (!pastedChapters) {
      updateStep(index, { text: nextText });
      return;
    }
    // Pasted Oracle text: its chapters become steps, in place of steps that are still empty.
    const before = formatSagaDraft({ ...draft, steps: steps.slice(0, index), rules: '' });
    const after = formatSagaDraft({
      ...draft,
      reminder: '',
      steps: steps.slice(index + 1).filter(other => other.text.trim()),
    });
    const keepsChapters = step.text.trim() && chapters[index].length && !parseChapterLine(lines[0]);
    const first = keepsChapters ? `${chapterPrefix(chapters[index])}${lines[0]}` : lines[0];
    update(readDraft([...before, first, ...lines.slice(1), ...after], steps));
  };

  const addStep = (chapterCount: number) => {
    const step: DraftStep = { id: newStepId(), chapterCount, text: '' };
    fields.focusNext(step.id);
    // A step without a chapter usually comes first.
    update({ ...draft, steps: chapterCount ? [...steps, step] : [step, ...steps] });
  };

  const removeStep = (index: number) =>
    update(settle({ ...draft, steps: steps.filter((_, i) => i !== index) }));

  const swapped = (index: number, offset: -1 | 1) => {
    const next = [...steps];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    return next;
  };
  // A creature's last step needs a chapter (see settle).
  const canEnd = (last: DraftStep) => !isCreature || last.chapterCount > 0;
  const canMove = (index: number, offset: -1 | 1) =>
    index + offset >= 0 &&
    index + offset < steps.length &&
    canEnd(swapped(index, offset)[steps.length - 1]);
  const canDropChapter = (index: number) => {
    const { chapterCount } = steps[index];
    return (
      chapterCount > 0 &&
      (chapterCount > 1 || index < steps.length - 1 || canEnd({ ...steps[index], chapterCount: 0 }))
    );
  };

  const reminderKind = getReminderKind(reminder);
  const customReminderShows = reminder.split('\n').every(line => isReminderLine(line));

  const labelId = `${id}-label`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <div className={styles.rulesLabelRow}>
        <span id={labelId} className={styles.label}>
          {name}
        </span>
        {labelAction}
      </div>
      <SymbolToolbar
        name={name}
        manaColors={manaColors}
        onInsert={symbol => fields.insert(symbol, steps[0]?.id ?? RULES_FIELD)}
      />
      <div className={styles.stepsEditor}>
        <SagaReminderSelect
          id={`${id}-reminder-kind`}
          kind={reminderKind}
          chapters={chapters.flat()}
          onSelect={nextReminder => update({ ...draft, reminder: nextReminder })}
        />
        {reminderKind === 'custom' && (
          <>
            <RulesTextArea
              {...fields.fieldProps(REMINDER_FIELD)}
              id={`${id}-reminder`}
              value={reminder}
              minRows={1}
              aria-label="Custom reminder text"
              aria-describedby={customReminderShows ? undefined : `${id}-reminder-hint`}
              onChange={nextText => update({ ...draft, reminder: nextText })}
            />
            {!customReminderShows && (
              <p id={`${id}-reminder-hint`} className={styles.fieldHint}>
                Put it in parentheses and mention lore counters. Other text shows as a step.
              </p>
            )}
          </>
        )}

        <ol className={styles.steps}>
          {steps.map((step, i) => {
            const numerals = chapters[i].map(toRomanNumeral);
            const stepName = `Step ${i + 1}`;
            return (
              <li key={step.id} className={styles.step}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepLabel}>
                    {numerals.length
                      ? numerals.map(numeral => (
                          <span key={numeral} className={styles.sagaNumeral}>
                            {numeral}
                          </span>
                        ))
                      : 'No chapter'}
                  </span>
                  <span className={styles.stepActions}>
                    <StepButton
                      icon={<MinusOutlined />}
                      step={stepName}
                      action="Fewer chapters"
                      disabled={!canDropChapter(i)}
                      onClick={() => updateStep(i, { chapterCount: step.chapterCount - 1 })}
                    />
                    <StepButton
                      icon={<PlusOutlined />}
                      step={stepName}
                      action="More chapters"
                      disabled={chapterTotal >= MAX_CHAPTERS}
                      onClick={() => updateStep(i, { chapterCount: step.chapterCount + 1 })}
                    />
                    <StepButton
                      icon={<ArrowUpOutlined />}
                      step={stepName}
                      action="Move up"
                      disabled={!canMove(i, -1)}
                      onClick={() => update({ ...draft, steps: swapped(i, -1) })}
                    />
                    <StepButton
                      icon={<ArrowDownOutlined />}
                      step={stepName}
                      action="Move down"
                      disabled={!canMove(i, 1)}
                      onClick={() => update({ ...draft, steps: swapped(i, 1) })}
                    />
                    <StepButton
                      icon={<DeleteOutlined />}
                      step={stepName}
                      action="Remove"
                      danger
                      onClick={() => removeStep(i)}
                    />
                  </span>
                </div>
                <RulesTextArea
                  {...fields.fieldProps(step.id)}
                  id={`${id}-step-${step.id}`}
                  value={step.text}
                  minRows={1}
                  placeholder={
                    numerals.length ? 'What happens in this chapter?' : 'An ability of its own'
                  }
                  aria-label={`${stepName} (${numerals.join(', ') || 'no chapter'})`}
                  // Further lines are the options of a modal step.
                  enterText={'\n* '}
                  onChange={nextText => changeStepText(i, nextText)}
                />
              </li>
            );
          })}
        </ol>

        <div className={styles.stepAddButtons}>
          <Button
            size="small"
            icon={<PlusOutlined aria-hidden="true" />}
            disabled={chapterTotal >= MAX_CHAPTERS}
            onClick={() => addStep(1)}
          >
            Add chapter
          </Button>
          <Button
            type="text"
            size="small"
            disabled={isCreature && chapterTotal === 0}
            onClick={() => addStep(0)}
          >
            Add step without chapter
          </Button>
        </div>

        {isCreature && (
          <div className={styles.sagaRulesField}>
            <label htmlFor={`${id}-rules`}>Below the type line</label>
            <RulesTextArea
              {...fields.fieldProps(RULES_FIELD)}
              id={`${id}-rules`}
              value={rules}
              minRows={1}
              placeholder="e.g. Flying"
              onChange={nextText => update({ ...draft, rules: nextText })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SagaStepsInput;
