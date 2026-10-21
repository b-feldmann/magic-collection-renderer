import React, { useState } from 'react';
import { Button, Modal } from 'antd';

import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../TemplatingCardRender/index';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import FavoriteHeart from '../FavoriteHeart/FavoriteHeart';
import AntIcon from '../AntIcon/AntIcon';

interface MobileBigCardRenderModalProps {
  card: CardInterface;
  visible: boolean;
  hide: () => void;
  collectionNumber: number;
  collectionSize: number;
  width: number;
  height: number;
  variantNavigation?: React.ReactNode;
  children?: React.ReactNode;
}

const MobileBigCardRenderModal = ({
  card,
  visible,
  hide,
  collectionNumber,
  collectionSize,
  width,
  height,
  variantNavigation,
  children,
}: MobileBigCardRenderModalProps) => {
  const [faceSelection, setFaceSelection] = useState({ uuid: card.uuid, visible, showBack: false });
  const newSession = faceSelection.uuid !== card.uuid || faceSelection.visible !== visible;
  if (newSession) {
    setFaceSelection({ uuid: card.uuid, visible, showBack: false });
  }
  // Match the collection: render only the selected face and suppress front-only
  // chrome (such as the mana cost) when showing the back.
  const face: CardFaceInterface =
    !newSession && faceSelection.showBack && card.back
      ? { ...card.back, backFace: true }
      : card.front;

  const wOffset = 40;
  const hOffset = variantNavigation ? 72 : 30;

  const dimFactor = CARD_WIDTH / CARD_HEIGHT;

  const modalMaxWidth = width - wOffset;
  const modalMaxHeight = height - hOffset;

  const cardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor);

  return (
    <Modal
      className={styles.mobileWrapper}
      wrapClassName="card-view"
      classNames={{ mask: 'card-view' }}
      open={visible}
      onOk={hide}
      onCancel={hide}
    >
      <div
        className={styles.mobilePositioner}
        style={{
          width: modalMaxWidth,
        }}
      >
        <div className={styles.mobileFaces}>
          <div
            key={card.uuid}
            className={styles.mobileCard}
            style={{ width: cardWidth, borderRadius: (cardWidth / CARD_WIDTH) * 60 }}
          >
            <CardRender
              containerWidth={cardWidth}
              {...face}
              cardID={card.uuid}
              creator={card.creator.name}
              rarity={card.rarity}
              manaCost={card.manaCost}
              collectionNumber={collectionNumber}
              collectionSize={collectionSize}
            />
            <FavoriteHeart favorite={card.favorite} />
          </div>
        </div>
        {(card.back || variantNavigation) && (
          <div className={styles.mobileCardControls} role="group" aria-label="Card controls">
            {card.back && (
              <Button
                aria-label="Show other face"
                icon={<AntIcon type="swap" />}
                onClick={() =>
                  setFaceSelection(selection => ({ ...selection, showBack: !selection.showBack }))
                }
              />
            )}
            {variantNavigation}
          </div>
        )}
        <div className={`${styles.annotationView} ${styles.mobileAnnotations}`}>{children}</div>
      </div>
    </Modal>
  );
};

export default MobileBigCardRenderModal;
