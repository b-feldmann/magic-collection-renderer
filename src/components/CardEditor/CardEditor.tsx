import React, { useState, useEffect } from 'react';
import CardInterface from '../../interfaces/CardInterface';

import styles from './styles.module.scss';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
import EditField from './EditField';
import { Button, Col, Row } from 'antd';

import _ from 'lodash';
import useWindowDimensions from '../../useWindowDimensions';

interface CardEditorInterface {
  card: CardInterface;
  saveTmpCard: (card: CardInterface | null) => void;
  saveCard: (card: CardInterface) => void;
}

const CardEditor: React.FC<CardEditorInterface> = ({
  card,
  saveCard,
  saveTmpCard
}: CardEditorInterface) => {
  const [contentChanged, setContentChanged] = useState<boolean>(false);
  const [originalCard, setOriginalCard] = useState<CardInterface>(card);
  const [tmpCard, setTmpCard] = useState<CardInterface>(card);
  const [timerId, setTimerId] = useState<any>(-1);

  const { height } = useWindowDimensions();

  let small = false;
  let tiny = false;

  if (height < 840) small = true;
  if (height < 710) tiny = true;

  const getValue = (key: string): any => {
    return tmpCard[key];
  };

  const saveValue = (key: string, value: any) => {
    const newTmpCard = { ...tmpCard };
    newTmpCard[key] = value;
    setTmpCard(newTmpCard);

    setContentChanged(true);

    clearTimeout(timerId);
    const tmpId = setTimeout(() => {
      saveTmpCard(newTmpCard);
    }, 300);
    setTimerId(tmpId);
  };

  const discardChanges = () => {
    if (!contentChanged) return;

    setTmpCard(originalCard);
    saveTmpCard(null);
    setContentChanged(false);
  };

  const saveChanges = () => {
    if (!contentChanged) return;

    setTmpCard(originalCard);
    saveTmpCard(null);
    saveCard(tmpCard);
    setContentChanged(false);
  };

  useEffect(() => {
    if (_.isEqual(originalCard, tmpCard)) {
      saveTmpCard(null);
      setContentChanged(false);
    }
  });

  useEffect(() => {
    setTmpCard(card);
    setOriginalCard(card);
    saveTmpCard(null);
    setContentChanged(false);
  }, [card.cardID]);

  const inputConfig = [
    { key: 'name', type: 'input', name: 'Card Name' },
    { key: 'manaCost', type: 'input', name: 'Mana Cost' },
    { key: 'legendary', type: 'bool', name: 'Legendary?' },
    {
      key: 'cardMainType',
      type: 'select',
      name: 'Card Type',
      data: Object.keys(CardMainType).map((type: any) => CardMainType[type])
    },
    { key: 'cardSubTypes', type: 'input', name: 'Card Sub Types' },
    {
      key: 'rarity',
      type: 'select',
      name: 'Rarity',
      data: Object.keys(RarityType).map((type: any) => RarityType[type])
    },
    { key: 'cardText', type: 'area', name: 'Card Text' },
    { key: 'flavourText', type: 'area-small', name: 'Flavour Text' },
    { key: 'flavourAuthor', type: 'input', name: 'Flavour Text Author' },
    { key: 'cardStats', type: 'input', name: 'Power / Toughness' },
    {
      key: 'creator',
      type: 'select',
      name: 'Card Creator',
      data: Object.keys(Creators).map((type: any) => Creators[type])
    }
  ];

  return (
    <div className={styles.editor}>
      {inputConfig.map(config => (
        <div key={`card-editor-key:${config.key}`}>
          <EditField
            fieldKey={config.key}
            type={config.type}
            data={config.data}
            name={config.name}
            saveValue={saveValue}
            getValue={getValue}
          />
        </div>
      ))}
      <Row className={tiny ? styles.tiny : ''}>
        <Col span={12}>
          <Button
            size={small ? 'small' : 'default'}
            className={styles.button}
            disabled={!contentChanged}
            onClick={saveChanges}
            type="primary"
          >
            Save Changes
          </Button>
        </Col>
        <Col span={12}>
          <Button
            size={small ? 'small' : 'default'}
            className={styles.button}
            disabled={!contentChanged}
            onClick={discardChanges}
            type="danger"
          >
            Discard Changes
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default CardEditor;
