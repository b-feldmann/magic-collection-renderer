import React, { useContext } from 'react';
import { Button, Card, Icon, Modal, Tooltip } from 'antd';

import _ from 'lodash';

import CardInterface from '../../interfaces/CardInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../CardRender/CardRender';
// import CardRender from '../CardPixiRender';
import { Store, StoreType } from '../../store';
import useWindowDimensions from '../../useWindowDimensions';
import AnnotationList from '../AnnotationList/AnnotationList';
import { createAnnotation } from '../../actions/annotationActions';
import { CardState } from '../../interfaces/enums';
import { updateCard } from '../../actions/cardActions';

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
  const { annotationAccessor, currentUser, user, dispatch } = useContext<StoreType>(Store);

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

  const updateState = (newState: CardState) => {
    const updatedCard = { ...card };
    updatedCard.meta.state = newState;
    updateCard(dispatch, updatedCard);
  };

  const draftView = (
    <Button
      ghost
      type="danger"
      size="small"
      style={{ width: '100%' }}
      onClick={() => updateState(CardState.Rate)}
    >
      Release for Rating!
    </Button>
  );

  const liked = !!_.find(card.meta.likes, o => o === currentUser.uuid);
  const disliked = !liked && !!_.find(card.meta.dislikes, o => o === currentUser.uuid);

  const like = () => {
    if (liked) return;

    const updatedCard = { ...card };
    if (disliked) {
      updatedCard.meta.dislikes = updatedCard.meta.dislikes.filter(o => o !== currentUser.uuid);
    }
    updatedCard.meta.likes.push(currentUser.uuid);
    updateCard(dispatch, updatedCard);
  };

  const dislike = () => {
    if (disliked) return;

    const updatedCard = { ...card };
    if (liked) {
      updatedCard.meta.likes = updatedCard.meta.likes.filter(o => o !== currentUser.uuid);
    }
    updatedCard.meta.dislikes.push(currentUser.uuid);
    updateCard(dispatch, updatedCard);
  };

  const userUuidToNames = (uuids: string[]) =>
    uuids
      .map(uuid => _.find(user, u => u.uuid === uuid) || { name: '' })
      .map(u => u.name)
      .join(', ');

  const rateView = (
    <div>
      <span onClick={like} style={{ cursor: 'pointer' }}>
        <Tooltip title={userUuidToNames(card.meta.likes)}>
          <Icon type="like" theme={liked ? 'filled' : 'outlined'} />
        </Tooltip>
        <span style={{ paddingLeft: 4 }}>{card.meta.likes.length}</span>
      </span>
      <span onClick={dislike} style={{ paddingLeft: 8, cursor: 'pointer' }}>
        <Tooltip title={userUuidToNames(card.meta.dislikes)}>
          <Icon type="dislike" theme={disliked ? 'filled' : 'outlined'} />
        </Tooltip>
        <span style={{ paddingLeft: 4 }}>{card.meta.dislikes.length}</span>
      </span>
      <span>
        <Button
          disabled={card.meta.likes.length < 5}
          className={styles.stateButton}
          ghost={card.meta.likes.length >= 5}
          type="danger"
          size="small"
          onClick={() => updateState(CardState.Approved)}
        >
          {`Approve!${
            card.meta.likes.length < 5 ? ` (need ${5 - card.meta.likes.length} more likes)` : ''
          }`}
        </Button>
      </span>
    </div>
  );

  let view = <div />;
  if (card.meta.state === CardState.Draft) view = draftView;
  if (card.meta.state === CardState.Rate) view = rateView;
  // view = rateView;

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
                creator={card.creator.name}
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
          >
            <Card size="small" bordered={false} className={styles.cardComment}>
              {card.meta.comment && <p>{card.meta.comment}</p>}
              {view}
            </Card>
          </AnnotationList>
        </div>
      </div>
    </Modal>
  );
};

export default BigCardRenderModal;
