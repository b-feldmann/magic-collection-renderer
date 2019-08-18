import React, { useContext } from 'react';
import { Modal } from 'antd';
import _ from 'lodash';
import CardInterface from '../../interfaces/CardInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../CardRender/CardRender';
import { Store, StoreType } from '../../store';
import useWindowDimensions from '../../useWindowDimensions';
import AnnotationList from '../AnnotationList/AnnotationList';
import { createAnnotation } from '../../actions/annotationActions';

interface BigCardRenderModalProps {
  card: CardInterface;
  visible: boolean;
  hide: () => void;
  collectionNumber: number;
  collectionSize: number;
}

const BigCardRenderModal = ({
  card,
  visible,
  hide,
  collectionNumber,
  collectionSize
}: BigCardRenderModalProps) => {
  const { annotationAccessor, dispatch } = useContext<StoreType>(Store);

  const annotations = annotationAccessor[card.uuid] || [];

  const faces = [card.front];
  if (card.back) faces.push(card.back);

  const { width, height } = useWindowDimensions();
  const wOffset = 100;
  const hEditorSpace = faces.length === 2 ? 200 : 0;
  const hOffset = 200;

  const dimFactor = 488 / 680;

  const modalMaxWidth = (width / 100) * 62.5 - wOffset;
  const modalMaxHeight = height - hOffset - hEditorSpace;
  const modalSingleCardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor);
  const modalDoubleCardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor * 2);

  const singleCardWidth = faces.length === 2 ? modalDoubleCardWidth / 2 : modalSingleCardWidth;
  const fullCardWidth = faces.length === 2 ? modalDoubleCardWidth : modalSingleCardWidth;
  const cardHeight = singleCardWidth / dimFactor;

  const annotationWidth = faces.length === 2 ? fullCardWidth : modalMaxWidth - singleCardWidth;
  const annotationHeight =
    faces.length === 2 ? modalMaxHeight - cardHeight + hEditorSpace : cardHeight;

  return (
    <Modal
      className={styles.modalCardViewWrapper}
      wrapClassName="card-view"
      title={`View ${card.name}`}
      visible={visible}
      onOk={hide}
      onCancel={hide}
    >
      <div
        className={styles.view}
        style={{
          width: faces.length === 2 ? fullCardWidth : modalMaxWidth,
          flexDirection: faces.length === 2 ? 'column' : 'row'
        }}
      >
        <div
          className={`${styles.modalCardGroupWrapper} ${
            faces.length === 2
              ? styles.modalCardGroupWrapperDouble
              : styles.modalCardGroupWrapperSingle
          }`}
          style={{
            width: fullCardWidth
          }}
        >
          {faces.map(face => (
            <div
              className={styles.modalCardWrapper}
              style={{
                width: singleCardWidth
              }}
            >
              <CardRender
                containerWidth={singleCardWidth}
                {...face}
                cardID={card.uuid}
                creator={card.creator}
                rarity={card.rarity}
                manaCost={card.manaCost}
                collectionNumber={collectionNumber}
                collectionSize={collectionSize}
              />
            </div>
          ))}
        </div>
        <div
          className={styles.annotationView}
          style={{
            width: `${faces.length === 2 ? modalMaxWidth : annotationWidth}px`,
            height: `${annotationHeight}px`,
            marginLeft: faces.length === 2 ? `-${(modalMaxWidth - annotationWidth) * 0.5}px` : '0px'
          }}
        >
          <AnnotationList
            split={faces.length === 2}
            annotations={annotations}
            createAnnotation={(content, author) =>
              createAnnotation(dispatch, content, author, card.uuid)
            }
          />
        </div>
      </div>
    </Modal>
  );
};

export default BigCardRenderModal;
