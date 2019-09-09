import React, { useContext } from 'react';
import { Button, Card, Icon, Modal, Tooltip } from 'antd';

import _ from 'lodash';

import LogRocket from 'logrocket';
import CardInterface from '../../interfaces/CardInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../TemplatingCardRender';
import { Store, StoreType } from '../../store';
import useWindowDimensions from '../../useWindowDimensions';
import AnnotationList from '../AnnotationList/AnnotationList';
import { createAnnotation } from '../../actions/annotationActions';
import { CardState } from '../../interfaces/enums';
import { updateCard } from '../../actions/cardActions';
import { NEEDED_LIKES_TO_APPROVE } from '../../utils/constants';
import MobileBigCardRenderModal from './MobileBigCardRenderModal';

interface BigCardRenderModalProps {
  card: CardInterface;
  visible: boolean;
  hide: () => void;
  collectionNumber: number;
  collectionSize: number;
  mobile?: boolean;
}

const BigCardRenderModal = ({
  card,
  visible,
  hide,
  collectionNumber,
  collectionSize,
  mobile
}: BigCardRenderModalProps) => {
  const { annotationAccessor, currentUser, user, dispatch } = useContext<StoreType>(Store);

  const annotations = annotationAccessor[card.uuid] || [];

  const faces = [card.front];
  if (card.back) faces.push(card.back);

  const { width, height } = useWindowDimensions();
  if (mobile)
    return (
      <MobileBigCardRenderModal
        card={card}
        visible={visible}
        hide={hide}
        collectionNumber={collectionNumber}
        collectionSize={collectionSize}
        width={width}
        height={height}
      />
    );

  const rowLayout = faces.length === 2;

  const wOffset = 50;
  const hEditorSpace = rowLayout ? 200 : 0;
  const hOffset = 200;

  const dimFactor = 720.0 / 1020.0;

  const modalMaxWidth = (width / 100) * 62.5 - wOffset;
  const modalMaxHeight = height - hOffset - hEditorSpace;
  const modalSingleCardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor);
  const modalDoubleCardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor * 2);

  const singleCardWidth = faces.length === 2 ? modalDoubleCardWidth / 2 : modalSingleCardWidth;
  const fullCardWidth = faces.length === 2 ? modalDoubleCardWidth : modalSingleCardWidth;
  const cardHeight = singleCardWidth / dimFactor;

  const annotationWidth = rowLayout ? singleCardWidth * 2 : modalMaxWidth - singleCardWidth;
  const annotationHeight = rowLayout ? modalMaxHeight - cardHeight + hEditorSpace : cardHeight;

  const updateState = (newState: CardState) => {
    LogRocket.log(`Update Card State to ${newState}`, card.name);
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

  const neededLikesCount = Math.max(
    NEEDED_LIKES_TO_APPROVE - card.meta.likes.length + card.meta.dislikes.length,
    0
  );

  const like = () => {
    if (liked) return;

    LogRocket.log('Like Card', card.name, card);
    const updatedCard = { ...card };
    if (disliked) {
      updatedCard.meta.dislikes = updatedCard.meta.dislikes.filter(o => o !== currentUser.uuid);
    }
    updatedCard.meta.likes.push(currentUser.uuid);
    updateCard(dispatch, updatedCard);
  };

  const dislike = () => {
    if (disliked) return;

    LogRocket.log('Dislike Card', card.name, card);
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
          disabled={neededLikesCount > 0}
          className={styles.stateButton}
          ghost={neededLikesCount === 0}
          type="danger"
          size="small"
          onClick={() => updateState(CardState.Approved)}
        >
          {`Approve!${neededLikesCount > 0 ? ` (need ${neededLikesCount} more likes)` : ''}`}
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
          width: rowLayout ? fullCardWidth : modalMaxWidth,
          flexDirection: rowLayout ? 'column' : 'row'
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
            width: `${annotationWidth}px`,
            height: `${annotationHeight}px`
          }}
        >
          <AnnotationList
            split={rowLayout}
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
