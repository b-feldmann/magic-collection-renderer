import { Button, Spin } from 'antd';
import React from 'react';
import { areEqual } from 'react-window';
import styles from './styles.module.scss';
import ActionHover from '../ActionHover/ActionHover';
// import CardRender from '../CardRender/CardRender';
import CardRender from '../TemplatingCardRender';
import GlowingStar from '../GlowingStar';
import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';

interface CellDataProps {
  columnCount: number;
  cards: CardInterface[];
  seenCardUuids: { [key: string]: boolean };
  currentEditId: string;
  addSeenCard: (uuid: string) => void;
  editCard: (uuid: string) => void;
  downloadCard: (uuid: string) => void;
  toggleShowBackConfig: (uuid: string) => void;
  width: number;
  showBackFaceConfig: { [key: string]: boolean };
  mobile?: boolean;
}

interface CellProps {
  style: object;
  columnIndex: number;
  rowIndex: number;
  data: CellDataProps;
}

const Cell = ({ style, columnIndex, rowIndex, data }: CellProps) => {
  const {
    cards,
    columnCount,
    seenCardUuids,
    currentEditId,
    addSeenCard,
    downloadCard,
    editCard,
    toggleShowBackConfig,
    width,
    showBackFaceConfig,
    mobile
  } = data;

  const index = columnIndex + rowIndex * columnCount;
  if (index >= cards.length) return <div />;
  const card = cards[index];

  const isNew = !seenCardUuids[card.uuid];

  const getCardFace = (c: CardInterface): CardFaceInterface => {
    if (!c.back || !showBackFaceConfig[c.uuid]) return c.front;
    return { ...c.back, backFace: true };
  };

  return (
    <div className={styles.cardBox} key={card.uuid} style={style}>
      {isNew && <GlowingStar />}
      <Spin size="large" spinning={!!card.loading}>
        <ActionHover
          onHover={() => {
            if (isNew) addSeenCard(card.uuid);
            if (mobile) editCard(card.uuid);
          }}
          active={card.uuid === currentEditId}
          northAction={
            mobile
              ? undefined
              : {
                  icon: 'edit',
                  action: () => editCard(card.uuid)
                }
          }
          southAction={
            mobile
              ? undefined
              : {
                  icon: 'download',
                  action: () => downloadCard(card.uuid)
                }
          }
        >
          <CardRender
            containerWidth={width}
            {...getCardFace(card)}
            cardID={card.uuid}
            rarity={card.rarity}
            manaCost={card.manaCost}
            creator={card.creator.name}
            collectionNumber={index + 1}
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
    </div>
  );
};

export default React.memo(Cell, areEqual);
