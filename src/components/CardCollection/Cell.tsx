import { Button, Spin } from 'antd';
import React from 'react';
import styles from './styles.module.scss';
import AntIcon from '../AntIcon/AntIcon';
import ActionHover from '../ActionHover/ActionHover';
// import CardRender from '../CardRender/CardRender';
import CardRender from '../TemplatingCardRender/index';
import GlowingStar from '../GlowingStar/index';
import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';

export interface CellData {
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

// Props injected by react-window v2's `Grid` component, merged with our `cellProps`.
export type CellProps = CellData & {
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
};

const Cell = ({
  ariaAttributes,
  style,
  columnIndex,
  rowIndex,
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
  mobile,
}: CellProps) => {
  const index = columnIndex + rowIndex * columnCount;
  if (index >= cards.length) return <div style={style} {...ariaAttributes} />;
  const card = cards[index];

  const isNew = !seenCardUuids[card.uuid];

  const getCardFace = (c: CardInterface): CardFaceInterface => {
    if (!c.back || !showBackFaceConfig[c.uuid]) return c.front;
    return { ...c.back, backFace: true };
  };

  return (
    <div className={styles.cardBox} style={style} {...ariaAttributes}>
      {isNew && <GlowingStar />}
      <Spin size="large" spinning={!!card.loading}>
        <ActionHover
          onHover={() => {
            if (isNew) addSeenCard(card.uuid);
            // if (mobile) editCard(card.uuid);
            editCard(card.uuid);
          }}
          active={card.uuid === currentEditId}
          // northAction={
          //   mobile
          //     ? undefined
          //     : {
          //         icon: 'edit',
          //         action: () => editCard(card.uuid),
          //       }
          // }
          // southAction={
          //   mobile
          //     ? undefined
          //     : {
          //         icon: 'download',
          //         action: () => downloadCard(card.uuid),
          //       }
          // }
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
          icon={<AntIcon type="swap" />}
          className={styles.swapButton}
          onClick={() => toggleShowBackConfig(card.uuid)}
        />
      )}
    </div>
  );
};

export default Cell;
