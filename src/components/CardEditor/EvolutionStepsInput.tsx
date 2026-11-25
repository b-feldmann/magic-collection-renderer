import React, { useRef, useState } from 'react';
import { Button, Input, Radio } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { ColorType, EvolutionSplit } from '../../interfaces/enums';
import { getEvolutionSplit, hasSecondLevel } from '../../utils/evolutionLevels';
import RulesTextArea from './RulesTextArea';
import StepButton from './StepButton';
import SymbolToolbar from './SymbolToolbar';
import styles from './styles.module.scss';
import useStepFields from './useStepFields';

const BASE = { name: 'Base', text: 'cardText', stats: 'cardStats' };
const [LEVEL_1, LEVEL_2] = [1, 2].map(level => ({
  name: `Level ${level}`,
  indicator: `level${level}Indicator`,
  text: `level${level}Text`,
  stats: `level${level}Stats`,
}));

const SPLITS = [
  { split: EvolutionSplit.Auto, title: 'Whichever allows the largest text' },
  { split: EvolutionSplit.Even, title: 'Equal heights', rows: '1fr 1fr' },
  { split: EvolutionSplit.TallBase, title: 'Taller base', rows: '2fr 1fr' },
  { split: EvolutionSplit.TallLevel, title: 'Taller level', rows: '1fr 2fr' },
];

interface LevelStatsProps {
  step: string;
  value: string;
  onChange: (stats: string) => void;
}

/** The power and toughness of a step. */
const LevelStats = ({ step, value, onChange }: LevelStatsProps) => {
  const [power = '', toughness = ''] = value.split('/');
  return (
    <span role="group" aria-label={`${step}: power/toughness`} className={styles.levelStats}>
      <Input
        variant="borderless"
        size="small"
        value={power}
        placeholder="0"
        autoComplete="off"
        aria-label={`${step}: power`}
        title="Power"
        onChange={event => onChange(`${event.target.value}/${toughness}`)}
      />
      <span aria-hidden="true">/</span>
      <Input
        variant="borderless"
        size="small"
        value={toughness}
        placeholder="0"
        autoComplete="off"
        aria-label={`${step}: toughness`}
        title="Toughness"
        onChange={event => onChange(`${power}/${event.target.value}`)}
      />
    </span>
  );
};

interface EvolutionStepsInputProps {
  id: string;
  name: string;
  /** The values of the card face's fields. */
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
  hasStats: boolean;
  /** Identifies the card face, whose second level may still be empty. */
  documentKey: string;
  manaColors?: ColorType[];
  /** The hints for some of the fields, shown below their step. */
  renderHints?: (fields: string[]) => React.ReactNode;
}

/** Edits the base and the levels of an evolution card. */
const EvolutionStepsInput = ({
  id,
  name,
  getValue,
  saveValue,
  hasStats,
  documentKey,
  manaColors,
  renderHints,
}: EvolutionStepsInputProps) => {
  const getText = (key: string): string[] => getValue(key) || [];
  const getString = (key: string): string => getValue(key) || '';

  // A second level that is shown stays until it's removed, also once it's empty.
  const isLevel2Filled =
    hasSecondLevel({
      level2Indicator: getString(LEVEL_2.indicator),
      level2Text: getText(LEVEL_2.text),
    }) ||
    (hasStats && /[^/\s]/.test(getString(LEVEL_2.stats)));
  const [state, setState] = useState({ documentKey, showsLevel2: isLevel2Filled });
  let { showsLevel2 } = state;
  if (state.documentKey !== documentKey || (isLevel2Filled && !showsLevel2)) {
    showsLevel2 = isLevel2Filled;
    setState({ documentKey, showsLevel2 });
  }
  const levels = showsLevel2 ? [LEVEL_1, LEVEL_2] : [LEVEL_1];

  const fields = useStepFields();
  const focusesAddedIndicator = useRef(false);

  const addLevel = () => {
    focusesAddedIndicator.current = true;
    setState({ documentKey, showsLevel2: true });
  };

  const removeLevel = (level: typeof LEVEL_1) => {
    if (level === LEVEL_1) {
      // The second level takes its place.
      saveValue(LEVEL_1.indicator, getString(LEVEL_2.indicator));
      saveValue(LEVEL_1.text, getText(LEVEL_2.text));
      saveValue(LEVEL_1.stats, getString(LEVEL_2.stats));
    }
    saveValue(LEVEL_2.indicator, '');
    saveValue(LEVEL_2.text, []);
    saveValue(LEVEL_2.stats, '');
    setState({ documentKey, showsLevel2: false });
  };

  const renderStats = (step: typeof BASE) =>
    hasStats && (
      <LevelStats
        step={step.name}
        value={getString(step.stats)}
        onChange={stats => saveValue(step.stats, stats)}
      />
    );

  const renderText = (step: typeof BASE, placeholder: string) => (
    <RulesTextArea
      {...fields.fieldProps(step.text)}
      id={`${id}-${step.text}`}
      value={getText(step.text).join('\n')}
      minRows={1}
      placeholder={placeholder}
      aria-label={`${step.name}: text`}
      onChange={text => saveValue(step.text, text ? text.split('\n') : [])}
    />
  );

  const labelId = `${id}-label`;
  const splitId = `${id}-split`;
  return (
    <div role="group" aria-labelledby={labelId}>
      <div className={styles.rulesLabelRow}>
        <span id={labelId} className={styles.label}>
          {name}
        </span>
      </div>
      <SymbolToolbar
        name={name}
        manaColors={manaColors}
        onInsert={symbol => fields.insert(symbol, BASE.text)}
      />
      <div className={styles.stepsEditor}>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <div className={styles.stepHeader}>
              <span className={styles.stepLabel}>{BASE.name}</span>
              <span className={styles.stepActions}>{renderStats(BASE)}</span>
            </div>
            {renderText(BASE, 'What can it do, and how does it evolve?')}
            {renderHints?.([BASE.text, BASE.stats])}
          </li>
          {levels.map(level => (
            <li key={level.name} className={styles.step} data-field-key={level.text}>
              <div className={styles.stepHeader}>
                <span className={styles.stepLabel}>{level.name}</span>
                <span className={styles.stepActions}>
                  {showsLevel2 && (
                    <StepButton
                      icon={<DeleteOutlined />}
                      step={level.name}
                      action="Remove"
                      danger
                      onClick={() => removeLevel(level)}
                    />
                  )}
                  {renderStats(level)}
                </span>
              </div>
              <div className={styles.levelAbility}>
                <span className={styles.levelArrowOutline}>
                  <span className={styles.levelArrow}>
                    <Input
                      ref={input => {
                        if (!input || level !== LEVEL_2 || !focusesAddedIndicator.current) return;
                        focusesAddedIndicator.current = false;
                        input.focus();
                      }}
                      variant="borderless"
                      size="small"
                      value={getString(level.indicator)}
                      placeholder={level === LEVEL_1 && showsLevel2 ? '1-2' : '3+'}
                      autoComplete="off"
                      aria-label={`${level.name}: indicator`}
                      title="The levels it applies to, e.g. 1-2 or 3+"
                      onChange={event => saveValue(level.indicator, event.target.value)}
                      onPressEnter={event => {
                        event.preventDefault();
                        fields.focus(level.text);
                      }}
                    />
                  </span>
                </span>
                {renderText(level, 'What can it do at this level?')}
              </div>
              {renderHints?.([level.indicator, level.text, level.stats])}
            </li>
          ))}
        </ol>

        <div className={styles.evolutionOptions}>
          <Button
            size="small"
            icon={<PlusOutlined aria-hidden="true" />}
            disabled={showsLevel2}
            onClick={addLevel}
          >
            Add level
          </Button>
          {!showsLevel2 && (
            <div className={styles.levelSplit}>
              <span id={splitId}>Text heights</span>
              <Radio.Group
                aria-labelledby={splitId}
                size="small"
                value={getEvolutionSplit(getValue('levelSplit'))}
                onChange={event => saveValue('levelSplit', event.target.value)}
              >
                {SPLITS.map(({ split, title, rows }) => (
                  <Radio.Button key={split} value={split} title={title}>
                    <span className={styles.levelSplitOption}>
                      {rows && (
                        <span
                          className={styles.levelSplitIcon}
                          style={{ gridTemplateRows: rows }}
                          aria-hidden="true"
                        />
                      )}
                      {split}
                    </span>
                  </Radio.Button>
                ))}
              </Radio.Group>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvolutionStepsInput;
