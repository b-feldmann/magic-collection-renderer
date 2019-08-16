import React, { useState } from 'react';
import { Button, Col, message, Spin } from 'antd';

// @ts-ignore
import useResizeAware from 'react-resize-aware';

import CardRender from '../CardRender/CardRender';
import ActionHover from '../ActionHover/ActionHover';
import styles from './styles.module.css';

import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import GlowingStar from '../GlowingStar';

export interface CardCollectionInterface {
  cards?: CardInterface[];
  editCard: (id: string) => void;
  downloadImage: (id: string) => void;
  downloadJson: (id: string) => void;
  viewCard: (id: string) => void;
  currentEditId: string;
  colSpan: number;
  seenCardUuids: { [key: string]: boolean };
  addSeenCard: (uuid: string) => void;
}

interface BackConfigInterface {
  [key: string]: boolean;
}

const CardCollection = ({
  cards = [],
  editCard,
  downloadJson,
  viewCard,
  currentEditId,
  colSpan,
  seenCardUuids,
  addSeenCard
}: CardCollectionInterface) => {
  const [showBackFaceConfig, setShowBackFaceConfig] = useState<BackConfigInterface>({});

  const getCardFace = (card: CardInterface): CardFaceInterface => {
    if (!card.back || !showBackFaceConfig[card.uuid]) return card.front;
    return { ...card.back, backFace: true };
  };

  const toggleShowBackConfig = (id: string) => {
    const newConfig = { ...showBackFaceConfig };
    newConfig[id] = !newConfig[id];
    setShowBackFaceConfig(newConfig);
  };

  const [resizeListener, sizes] = useResizeAware();

  return (
    <div>
      {resizeListener}
      {cards.map((card, i) => {
        const newCard = !seenCardUuids[card.uuid];
        return (
          <Col className={styles.cardBox} span={colSpan} key={card.uuid}>
            {newCard && <GlowingStar />}
            <Spin size="large" spinning={!!card.loading}>
              <ActionHover
                onHover={() => {
                  if (newCard) addSeenCard(card.uuid);
                }}
                active={currentEditId === card.uuid}
                northAction={{
                  icon: 'edit',
                  action: () => editCard(card.uuid)
                }}
                eastAction={{
                  icon: 'eye',
                  action: () => viewCard(card.uuid)
                }}
                southAction={{
                  icon: 'download',
                  action: () => message.error('Currently not implemented')
                }}
                westAction={{
                  icon: 'file-text',
                  action: () => downloadJson(card.uuid)
                }}
              >
                <CardRender
                  containerWidth={(sizes.width / 24) * colSpan - 8}
                  {...getCardFace(card)}
                  cardID={card.uuid}
                  rarity={card.rarity}
                  manaCost={card.manaCost}
                  creator={card.creator}
                  collectionNumber={i + 1}
                  collectionSize={cards.length}
                />
              </ActionHover>
            </Spin>
            {card.back && (
              <Button
                icon="swap"
                className={styles.swapButton}
                onClick={() => toggleShowBackConfig(card.uuid)}
              />
            )}
          </Col>
        );
      })}
    </div>
  );
};

export default CardCollection;
