import { Button, Spin } from 'antd';
import React, { useContext, useEffect } from 'react';
import styles from './styles.module.scss';
import AntIcon from '../AntIcon/AntIcon';
import ActionHover from '../ActionHover/ActionHover';
// import CardRender from '../CardRender/CardRender';
import CardRender from '../TemplatingCardRender/index';
import GlowingStar from '../GlowingStar/index';
import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import FavoriteHeart from '../FavoriteHeart/FavoriteHeart';
import { Store } from '../../store';
import { getImage } from '../../actions/imageActions';
import { isLoadingCover } from '../../utils/cover';
import MessageFilled from '@ant-design/icons/MessageFilled';
import useUnreadComments from '../../useUnreadComments';

export interface CellData {
  columnCount: number;
  cards: CardInterface[];
  variantGroups?: CardInterface[][];
  selectVariant?: (familyId: string, uuid: string) => void;
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
  variantGroups,
  selectVariant,
  columnCount,
  seenCardUuids,
  currentEditId,
  addSeenCard,
  editCard,
  toggleShowBackConfig,
  width,
  showBackFaceConfig,
  mobile,
}: CellProps) => {
  const index = columnIndex + rowIndex * columnCount;
  const card = cards[index];
  const { dispatch, annotationAccessor, currentUser } = useContext(Store);
  const hasUnreadComments = useUnreadComments(
    currentUser.uuid,
    card?.uuid || '',
    card ? annotationAccessor[card.uuid] : undefined,
  );
  useEffect(() => {
    if (!card) return;
    if (isLoadingCover(card.front.cover)) getImage(dispatch, card, 0);
    if (isLoadingCover(card.back?.cover)) getImage(dispatch, card, 1);
  }, [card, dispatch]);
  if (!card) return <div style={style} {...ariaAttributes} />;
  const family = variantGroups?.[index] || [card];
  const variantIndex = family.findIndex(member => member.uuid === card.uuid);

  const isNew = !seenCardUuids[card.uuid];

  const getCardFace = (c: CardInterface): CardFaceInterface => {
    if (!c.back || !showBackFaceConfig[c.uuid]) return c.front;
    return { ...c.back, backFace: true };
  };

  return (
    <div className={styles.cardBox} style={style} {...ariaAttributes}>
      {isNew && <GlowingStar />}
      {!mobile && hasUnreadComments && (
        <span
          className={styles.newComments}
          role="img"
          aria-label="New comments"
          title="New comments"
        >
          <MessageFilled aria-hidden="true" />
        </span>
      )}
      <Spin size="large" spinning={!!card.loading}>
        <ActionHover
          onClick={() => {
            editCard(card.uuid);
          }}
          onHover={() => {
            if (isNew) addSeenCard(card.uuid);
            if (mobile) editCard(card.uuid);
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
      <FavoriteHeart favorite={card.favorite} />
      {(family.length > 1 || card.back) && (
        <div className={styles.cardControls} role="group" aria-label="Card controls">
          {family.length > 1 && (
            <div className={styles.variantControls} role="group" aria-label="Card variants">
              <Button
                size="small"
                aria-label="Previous variant"
                onClick={() =>
                  selectVariant?.(
                    family[0].uuid,
                    family[(variantIndex + family.length - 1) % family.length].uuid,
                  )
                }
              >
                ‹
              </Button>
              <span aria-live="polite">
                {variantIndex + 1} / {family.length}
              </span>
              <Button
                size="small"
                aria-label="Next variant"
                onClick={() =>
                  selectVariant?.(family[0].uuid, family[(variantIndex + 1) % family.length].uuid)
                }
              >
                ›
              </Button>
            </div>
          )}
          {card.back && (
            <Button
              aria-label="Show other face"
              icon={<AntIcon type="swap" />}
              onClick={() => toggleShowBackConfig(card.uuid)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Cell;
