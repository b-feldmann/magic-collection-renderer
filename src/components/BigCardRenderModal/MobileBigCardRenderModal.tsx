import React from 'react';
import { Modal } from 'antd';

import CardInterface from '../../interfaces/CardInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../TemplatingCardRender/index';

interface MobileBigCardRenderModalProps {
  card: CardInterface;
  visible: boolean;
  hide: () => void;
  collectionNumber: number;
  collectionSize: number;
  width: number;
  height: number;
}

const MobileBigCardRenderModal = ({
  card,
  visible,
  hide,
  collectionNumber,
  collectionSize,
  width,
  height
}: MobileBigCardRenderModalProps) => {
  const faces = [card.front];
  if (card.back) faces.push(card.back);

  const portrait = height > width;

  const wOffset = 40;
  const hOffset = 30;

  const dimFactor = 720.0 / 1020.0;

  const modalMaxWidth = width - wOffset;
  const modalMaxHeight = height - hOffset;

  let modalWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor);
  let cardWidth = modalWidth;

  if (faces.length === 2) {
    if (portrait) {
      modalWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor * 0.5);
      cardWidth = modalWidth;
    } else {
      modalWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor * 2);
    }
  }

  return (
    <Modal
      className={styles.mobileWrapper}
      wrapClassName="card-view"
      visible={visible}
      onOk={hide}
      onCancel={hide}
    >
      <div
        className={styles.mobilePositioner}
        style={{
          width: modalWidth,
          flexDirection: portrait ? 'column' : 'row'
        }}
      >
        {faces.map(face => (
          <div style={{ width: cardWidth }}>
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
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default MobileBigCardRenderModal;
