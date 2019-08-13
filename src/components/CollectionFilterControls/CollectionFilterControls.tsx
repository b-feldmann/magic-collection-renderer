import React, { useEffect, useState } from 'react';
import { Checkbox, Input, Radio, Row } from 'antd';
import { CardMainType, ColorType, mapEnum, RarityType } from '../../interfaces/enums';

import styles from './styles.module.scss';
import CardInterface from '../../interfaces/CardInterface';
import cardToColor from '../CardRender/cardToColor';

export interface CollectionFilterInterface {
  colors: CheckBoxGroupInterface;
  rarity: CheckBoxGroupInterface;
  types: CheckBoxGroupInterface;
}

interface CollectionFilterControlsInterface {
  showColSpan?: boolean;
  setCollectionColSpan: (span: number) => void;
  setCollectionFilter: (filter: CollectionFilterInterface) => void;
  collection: CardInterface[];
  setNameFilter: (filter: string) => void;
}

export interface CheckBoxGroupInterface {
  [key: string]: boolean;
}

interface CardCountStats {
  [key: string]: number;
}

const CollectionFilterControls = ({
  setCollectionColSpan,
  setCollectionFilter,
  showColSpan = true,
  collection,
  setNameFilter
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

  const cardCountStats: CardCountStats = {};
  Object.values(CardMainType).forEach(key => {
    cardCountStats[key] = 0;
  });
  Object.values(RarityType).forEach(key => {
    cardCountStats[key] = 0;
  });
  Object.values(ColorType).forEach(key => {
    cardCountStats[key] = 0;
  });
  collection.forEach(card => {
    cardCountStats[cardToColor(card.front.cardMainType, card.manaCost).color] += 1;
    cardCountStats[card.front.cardMainType] += 1;
    cardCountStats[card.rarity] += 1;
  });

  useEffect(() => {
    setCollectionFilter({
      colors: shownColors,
      rarity: shownRarities,
      types: shownCardTypes
    });
  }, [shownColors, shownRarities, shownCardTypes, setCollectionFilter]);
  return (
    <div className={styles.controls}>
      <Row>
        <div className={styles.controlItem}>
          <h4>Filter by name</h4>
          <Input placeholder="Card Name" allowClear onChange={e => setNameFilter(e.target.value)} />
        </div>
        <div>
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
              key={`collection-filter-controls-checkbox-cardmaintype-${key}`}
              checked={shownCardTypes[key]}
              onChange={e =>
                updateEnumState(key, e.target.checked, shownCardTypes, setShownCardTypes)
              }
            >
              {`${key} (${cardCountStats[key]})`}
            </Checkbox>
          ))}
        </div>
        <div className={styles.controlItem}>
          <h4>Shown Colors</h4>
          {Object.values(ColorType).map((key: string) => {
            if (key === ColorType.Planeswalker) return '';
            return (
              <Checkbox
                key={`collection-filter-controls-checkbox-color-${key}`}
                checked={shownColors[key]}
                onChange={e => updateEnumState(key, e.target.checked, shownColors, setShownColors)}
              >
                {`${key} (${cardCountStats[key]})`}
              </Checkbox>
            );
          })}
        </div>
        <div className={styles.controlItem}>
          <h4>Shown Rarities</h4>
          {mapEnum(RarityType, (key: string) => (
            <Checkbox
              key={`collection-filter-controls-checkbox-rarity-${key}`}
              checked={shownRarities[key]}
              onChange={e =>
                updateEnumState(key, e.target.checked, shownRarities, setShownRarities)
              }
            >
              {`${key} (${cardCountStats[key]})`}
            </Checkbox>
          ))}
        </div>
      </Row>
    </div>
  );
};

export default CollectionFilterControls;
