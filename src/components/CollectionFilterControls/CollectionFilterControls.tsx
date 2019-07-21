import React, { useEffect, useState } from 'react';
import {
  CardMainType,
  ColorType,
  mapEnum,
  RarityType
} from '../../interfaces/enums';
import { Checkbox, Radio, Row } from 'antd';

import styles from './styles.module.scss';

export interface CollectionFilterInterface {
  colors: CheckBoxGroupInterface;
  rarity: CheckBoxGroupInterface;
  types: CheckBoxGroupInterface;
}

interface CollectionFilterControlsInterface {
  showColSpan?: boolean;
  setCollectionColSpan: (span: number) => void;
  setCollectionFilter: (filter: CollectionFilterInterface) => void;
  availableColors: string[];
  availableTypes: string[];
  availableRarities: string[];
}

export interface CheckBoxGroupInterface {
  [key: string]: boolean;
}

const CollectionFilterControls: React.FC<CollectionFilterControlsInterface> = ({
  setCollectionColSpan,
  setCollectionFilter,
  availableColors,
  availableRarities,
  availableTypes,
  showColSpan = true
}: CollectionFilterControlsInterface) => {
  const createEnumInitState = (values: string[]): CheckBoxGroupInterface => {
    const group: CheckBoxGroupInterface = {};
    values.forEach((value: string) => {
      group[value] = true;
    });
    return group;
  };

  const [colSpanSetting, setColSpanSetting] = useState(-1);
  const [shownCardTypes, setShownCardTypes] = useState<CheckBoxGroupInterface>(
    createEnumInitState(Object.values(CardMainType))
  );
  const [shownColors, setShownColors] = useState<CheckBoxGroupInterface>(
    createEnumInitState(Object.values(ColorType))
  );
  const [shownRarities, setShownRarities] = useState<CheckBoxGroupInterface>(
    createEnumInitState(Object.values(RarityType))
  );

  const updateEnumState = (
    key: string,
    value: boolean,
    data: CheckBoxGroupInterface,
    fct: (values: CheckBoxGroupInterface) => void
  ) => {
    const newState = { ...data };
    newState[key] = value;
    fct(newState);
  };

  const updateColSpan = (nextColSpan: number) => {
    setColSpanSetting(nextColSpan);
    setCollectionColSpan(nextColSpan);
  };

  useEffect(() => {
    setCollectionFilter({
      colors: shownColors,
      rarity: shownRarities,
      types: shownCardTypes
    });
  }, [shownColors, shownRarities, shownCardTypes]);
  return (
    <div className={styles.controls}>
      <Row>
        <div className={styles.controlItem}>
          {showColSpan && (
            <div className={styles.controlItem}>
              <h4>Cards per row</h4>
              <Radio.Group
                size="small"
                value={colSpanSetting.toString(10)}
                onChange={e => updateColSpan(parseInt(e.target.value, 10))}
              >
                <Radio.Button value="-1">Auto</Radio.Button>
                <Radio.Button value="24">1</Radio.Button>
                <Radio.Button value="12">2</Radio.Button>
                <Radio.Button value="8">3</Radio.Button>
                <Radio.Button value="6">4</Radio.Button>
                <Radio.Button value="4">6</Radio.Button>
                <Radio.Button value="3">8</Radio.Button>
                <Radio.Button value="2">12</Radio.Button>
                <Radio.Button value="1">24</Radio.Button>
              </Radio.Group>
            </div>
          )}
        </div>
        <div className={styles.controlItem}>
          <h4>Shown Card Types</h4>
          {mapEnum(CardMainType, (key: string) => (
            <Checkbox
              disabled={!availableTypes.includes(key)}
              checked={shownCardTypes[key]}
              onChange={e =>
                updateEnumState(
                  key,
                  e.target.checked,
                  shownCardTypes,
                  setShownCardTypes
                )
              }
            >
              {key}
            </Checkbox>
          ))}
        </div>
        <div className={styles.controlItem}>
          <h4>Shown Colors</h4>
          {Object.values(ColorType).map((key: string) => {
            if (key === ColorType.Planeswalker) return '';
            return (
              <Checkbox
                disabled={!availableColors.includes(key)}
                key={`collection-filter-color-${key}`}
                checked={shownColors[key]}
                onChange={e =>
                  updateEnumState(
                    key,
                    e.target.checked,
                    shownColors,
                    setShownColors
                  )
                }
              >
                {key}
              </Checkbox>
            );
          })}
        </div>
        <div className={styles.controlItem}>
          <h4>Shown Rarities</h4>
          {mapEnum(RarityType, (key: string) => (
            <Checkbox
              disabled={!availableRarities.includes(key)}
              checked={shownRarities[key]}
              onChange={e =>
                updateEnumState(
                  key,
                  e.target.checked,
                  shownRarities,
                  setShownRarities
                )
              }
            >
              {key}
            </Checkbox>
          ))}
        </div>
      </Row>
    </div>
  );
};

export default CollectionFilterControls;
