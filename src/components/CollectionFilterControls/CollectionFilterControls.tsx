import React, { useEffect, useState } from 'react';
import { Checkbox, Input, Row, Slider } from 'antd';
import { CardMainType, ColorTypePlus, mapEnum, RarityType } from '../../interfaces/enums';

import styles from './styles.module.scss';
import CardInterface from '../../interfaces/CardInterface';
import cardToColor from '../../utils/cardToColor';

export interface CollectionFilterInterface {
  colors: CheckBoxGroupInterface;
  rarity: CheckBoxGroupInterface;
  types: CheckBoxGroupInterface;
}

interface CollectionFilterControlsInterface {
  setCollectionColSpan?: (span: number) => void;
  setCollectionFilter?: (filter: CollectionFilterInterface) => void;
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
    createEnumInitState(Object.values(ColorTypePlus))
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

  const updateColSpan = (nextColSpan: number | [number, number]) => {
    let number = -1;
    if (typeof nextColSpan === 'number') {
      number = nextColSpan;
    }

    if (number === 0) number = -1;
    setColSpanSetting(number);
    setCollectionColSpan && setCollectionColSpan(number);
  };

  const cardCountStats: CardCountStats = {};
  Object.values(CardMainType).forEach(key => {
    cardCountStats[key] = 0;
  });
  Object.values(RarityType).forEach(key => {
    cardCountStats[key] = 0;
  });
  Object.values(ColorTypePlus).forEach(key => {
    cardCountStats[key] = 0;
  });
  collection.forEach(card => {
    cardCountStats[cardToColor(card.front.cardMainType, card.manaCost).color] += 1;
    cardCountStats[card.front.cardMainType] += 1;
    cardCountStats[card.rarity] += 1;
  });

  useEffect(() => {
    setCollectionFilter &&
      setCollectionFilter({
        colors: shownColors,
        rarity: shownRarities,
        types: shownCardTypes
      });
  }, [shownColors, shownRarities, shownCardTypes, setCollectionFilter]);

  const spanMarks = {
    0: 'Auto',
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8'
  };

  return (
    <div className={styles.controls}>
      <Row>
        <div className={styles.controlItem}>
          <h4>Filter by name</h4>
          <Input placeholder="Card Name" allowClear onChange={e => setNameFilter(e.target.value)} />
        </div>
        {setCollectionColSpan && (
          <div className={styles.controlItem}>
            <h4>Cards per row</h4>
            <Slider
              defaultValue={0}
              marks={spanMarks}
              step={1}
              included={false}
              min={0}
              max={8}
              onAfterChange={value => updateColSpan(value)}
            />
          </div>
        )}
        {setCollectionFilter && (
          <div>
            <div className={styles.controlItem}>
              <h4>Shown Card Types</h4>
              {mapEnum(CardMainType, (key: string) => (
                <Checkbox
                  key={`collection-filter-controls-checkbox-cardmaintype-${key}`}
                  checked={shownCardTypes[key]}
                  disabled={cardCountStats[key] === 0}
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
              {Object.values(ColorTypePlus).map((key: string) => {
                if (key === ColorTypePlus.Planeswalker) return '';
                return (
                  <Checkbox
                    key={`collection-filter-controls-checkbox-color-${key}`}
                    checked={shownColors[key]}
                    disabled={cardCountStats[key] === 0}
                    onChange={e =>
                      updateEnumState(key, e.target.checked, shownColors, setShownColors)
                    }
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
                  disabled={cardCountStats[key] === 0}
                  onChange={e =>
                    updateEnumState(key, e.target.checked, shownRarities, setShownRarities)
                  }
                >
                  {`${key} (${cardCountStats[key]})`}
                </Checkbox>
              ))}
            </div>
            <span> </span>
          </div>
        )}
      </Row>
    </div>
  );
};

export default CollectionFilterControls;
