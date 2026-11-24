import React, { useState } from 'react';
import { Button, Input } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ColorType } from '../../interfaces/enums';
import {
  cleanLoyaltyCost,
  formatLoyaltyAbilities,
  getLoyaltyShape,
  LoyaltyAbility,
  MAX_LOYALTY_ABILITIES,
  normalizeLoyaltyCost,
  parseLoyaltyAbilities,
  parseTypedCost,
  stepLoyaltyCost,
} from '../../utils/loyaltyAbilities';
import RulesTextArea from './RulesTextArea';
import StepButton from './StepButton';
import SymbolToolbar from './SymbolToolbar';
import styles from './styles.module.scss';
import useStepFields, { newStepId } from './useStepFields';

interface DraftAbility extends LoyaltyAbility {
  id: number;
}

interface DraftState {
  abilities: DraftAbility[];
  // What the abilities were read from or last written as. Other text replaces them.
  source: string;
}

interface PlaneswalkerStepsInputProps {
  id: string;
  name: string;
  value: string[];
  onChange: (lines: string[]) => void;
  /** Identifies the card face, whose draft may hold abilities that are still empty. */
  documentKey: string;
  manaColors?: ColorType[];
  labelAction?: React.ReactNode;
}

const SHIELD_CLASSES = {
  up: styles.loyaltyShieldUp,
  neutral: '',
  down: styles.loyaltyShieldDown,
};

const readAbilities = (lines: string[], previous: DraftAbility[] = []): DraftAbility[] =>
  parseLoyaltyAbilities(lines).map((ability, i) => ({
    ...ability,
    id: previous[i]?.id ?? newStepId(),
  }));

/** Edits a planeswalker's card text ability by ability. */
const PlaneswalkerStepsInput = ({
  id,
  name,
  value,
  onChange,
  documentKey,
  manaColors,
  labelAction,
}: PlaneswalkerStepsInputProps) => {
  const getSource = (lines: string[]) => JSON.stringify([documentKey, lines.join('\n')]);
  const source = getSource(value);

  const [state, setState] = useState<DraftState>(() => ({
    abilities: readAbilities(value),
    source,
  }));
  let draft = state;
  if (state.source !== source) {
    draft = { abilities: readAbilities(value, state.abilities), source };
    setState(draft);
  }
  const { abilities } = draft;
  const isFull = abilities.length >= MAX_LOYALTY_ABILITIES;

  const update = (next: DraftAbility[]) => {
    const lines = formatLoyaltyAbilities(next);
    setState({ abilities: next, source: getSource(lines) });
    onChange(lines);
  };

  const fields = useStepFields();

  const updateAbility = (index: number, changes: Partial<LoyaltyAbility>) =>
    update(abilities.map((ability, i) => (i === index ? { ...ability, ...changes } : ability)));

  const changeText = (index: number, nextText: string) => {
    const ability = abilities[index];
    if (!nextText.includes('\n')) {
      updateAbility(index, parseTypedCost(nextText) ?? { text: nextText });
      return;
    }
    // Enter starts another ability. Pasted lines become abilities, in place of ones that are
    // still empty.
    const isEnter = nextText.replace('\n', '') === ability.text;
    if (isEnter && isFull) return;
    const lines = nextText.split('\n').filter(line => isEnter || line.trim());
    const [first = '', ...others] = lines;
    const isOracleText = !ability.text.trim() && lines.some(line => parseTypedCost(line));
    const added = others.map(line => ({
      ...(parseTypedCost(line) ?? { cost: '', text: line }),
      id: newStepId(),
    }));
    if (added.length) fields.focusNext(added[added.length - 1].id);
    update([
      ...abilities.slice(0, index),
      {
        ...ability,
        ...(parseTypedCost(first) ?? { cost: isOracleText ? '' : ability.cost, text: first }),
      },
      ...added,
      ...abilities.slice(index + 1).filter(({ text }) => isEnter || text.trim()),
    ]);
  };

  const addAbility = (cost: string) => {
    const ability: DraftAbility = { id: newStepId(), cost, text: '' };
    fields.focusNext(ability.id);
    // An ability without a cost usually comes first.
    update(cost ? [...abilities, ability] : [ability, ...abilities]);
  };

  const move = (index: number, offset: -1 | 1) => {
    const next = [...abilities];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    update(next);
  };

  const changeCost = (index: number, offset: -1 | 1) => {
    const cost = stepLoyaltyCost(abilities[index].cost, offset);
    if (cost !== null) updateAbility(index, { cost });
  };

  const onCostKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      changeCost(index, event.key === 'ArrowUp' ? 1 : -1);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      fields.focus(abilities[index].id);
    }
  };

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
        onInsert={symbol => fields.insert(symbol, abilities[0]?.id)}
      />
      <div className={styles.stepsEditor}>
        {abilities.length > 0 && (
          <ol className={styles.steps}>
            {abilities.map(({ id: abilityId, cost, text }, i) => {
              const abilityName = `Ability ${i + 1}`;
              const writtenCost = normalizeLoyaltyCost(cost);
              const shieldClass = writtenCost
                ? SHIELD_CLASSES[getLoyaltyShape(writtenCost)]
                : styles.loyaltyShieldEmpty;
              return (
                <li key={abilityId} className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepLabel}>
                      {cost ? 'Loyalty ability' : 'No loyalty cost'}
                    </span>
                    <span className={styles.stepActions}>
                      <StepButton
                        icon={<MinusOutlined />}
                        step={abilityName}
                        action="Less loyalty"
                        disabled={stepLoyaltyCost(cost, -1) === null}
                        onClick={() => changeCost(i, -1)}
                      />
                      <StepButton
                        icon={<PlusOutlined />}
                        step={abilityName}
                        action="More loyalty"
                        disabled={stepLoyaltyCost(cost, 1) === null}
                        onClick={() => changeCost(i, 1)}
                      />
                      <StepButton
                        icon={<ArrowUpOutlined />}
                        step={abilityName}
                        action="Move up"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      />
                      <StepButton
                        icon={<ArrowDownOutlined />}
                        step={abilityName}
                        action="Move down"
                        disabled={i === abilities.length - 1}
                        onClick={() => move(i, 1)}
                      />
                      <StepButton
                        icon={<DeleteOutlined />}
                        step={abilityName}
                        action="Remove"
                        danger
                        onClick={() => update(abilities.filter((_, j) => j !== i))}
                      />
                    </span>
                  </div>
                  <div className={styles.loyaltyAbility}>
                    <span className={styles.loyaltyCost}>
                      <span className={`${styles.loyaltyShield} ${shieldClass}`}>
                        <Input
                          variant="borderless"
                          size="small"
                          value={cost}
                          placeholder="–"
                          autoComplete="off"
                          aria-label={`${abilityName}: loyalty cost`}
                          title="Loyalty cost, e.g. +1, 0, −3 or −X. Empty for an ability without one."
                          onChange={event =>
                            updateAbility(i, { cost: cleanLoyaltyCost(event.target.value) })
                          }
                          onFocus={event => event.target.select()}
                          onBlur={() => {
                            const normalized = normalizeLoyaltyCost(cost);
                            if (normalized !== cost) updateAbility(i, { cost: normalized });
                          }}
                          onKeyDown={event => onCostKeyDown(event, i)}
                        />
                      </span>
                    </span>
                    <RulesTextArea
                      {...fields.fieldProps(abilityId)}
                      id={`${id}-ability-${abilityId}`}
                      value={text}
                      minRows={1}
                      placeholder={
                        cost ? 'What does this ability do?' : 'A static or triggered ability'
                      }
                      aria-label={`${abilityName} (${cost || 'no loyalty cost'})`}
                      onChange={nextText => changeText(i, nextText)}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className={styles.stepAddButtons}>
          <Button
            size="small"
            icon={<PlusOutlined aria-hidden="true" />}
            disabled={isFull}
            onClick={() => addAbility(abilities.some(({ cost }) => cost) ? '−1' : '+1')}
          >
            Add loyalty ability
          </Button>
          <Button type="text" size="small" disabled={isFull} onClick={() => addAbility('')}>
            Add ability without cost
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlaneswalkerStepsInput;
