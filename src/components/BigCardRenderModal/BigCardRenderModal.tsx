import React, { ReactElement, useContext, useMemo } from 'react';
import { Button, Card, Modal, Tooltip } from 'antd';

import AntIcon from '../AntIcon/AntIcon';

import LogRocket from 'logrocket';
import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../TemplatingCardRender/index';
import { Store, StoreType } from '../../store';
import useWindowDimensions from '../../useWindowDimensions';
import AnnotationList from '../AnnotationList/AnnotationList';
import { createAnnotation } from '../../actions/annotationActions';
import { CardState } from '../../interfaces/enums';
import { updateCard } from '../../actions/cardActions';
import { NEEDED_LIKES_TO_APPROVE, CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import MobileBigCardRenderModal from './MobileBigCardRenderModal';
import RotateToMouse from '../RotateToMouse/RotateToMouse';

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
  mobile,
}: BigCardRenderModalProps) => {
  const { annotationAccessor, currentUser, user, dispatch } = useContext<StoreType>(Store);

  // O(1) uuid -> name lookups instead of an O(n) `_.find` per uuid.
  const userNameByUuid = useMemo(() => new Map(user.map(u => [u.uuid, u.name])), [user]);

  const annotations = annotationAccessor[card.uuid] || [];

  // Mark the back face so card renderers suppress front-only chrome
  // (e.g. the mana cost) on it, matching CardCollection's Cell.
  const faces: CardFaceInterface[] = [card.front];
  if (card.back)
    faces.push({
      ...card.back,
      backFace: true,
    });

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

  const dimFactor = CARD_WIDTH / CARD_HEIGHT;

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
    updateCard(dispatch, updatedCard).catch(() => {});
  };

  const releaseForRatingButton =
    card.meta.state === CardState.Draft ? (
      <Button ghost danger size="small" onClick={() => updateState(CardState.Rate)}>
        Release for Rating!
      </Button>
    ) : undefined;

  const liked = card.meta.likes.includes(currentUser.uuid);
  const disliked = !liked && card.meta.dislikes.includes(currentUser.uuid);

  const neededLikesCount = Math.max(
    NEEDED_LIKES_TO_APPROVE - card.meta.likes.length + card.meta.dislikes.length,
    0,
  );

  const like = () => {
    if (liked) return;

    LogRocket.log('Like Card', card.name, card);
    const updatedCard = { ...card };
    if (disliked) {
      updatedCard.meta.dislikes = updatedCard.meta.dislikes.filter(o => o !== currentUser.uuid);
    }
    updatedCard.meta.likes.push(currentUser.uuid);
    updateCard(dispatch, updatedCard).catch(() => {});
  };

  const dislike = () => {
    if (disliked) return;

    LogRocket.log('Dislike Card', card.name, card);
    const updatedCard = { ...card };
    if (liked) {
      updatedCard.meta.likes = updatedCard.meta.likes.filter(o => o !== currentUser.uuid);
    }
    updatedCard.meta.dislikes.push(currentUser.uuid);
    updateCard(dispatch, updatedCard).catch(() => {});
  };

  const userUuidToNames = (uuids: string[]) =>
    uuids.map(uuid => userNameByUuid.get(uuid) || '').join(', ');

  const rateView = (
    <div>
      <span onClick={like} style={{ cursor: 'pointer' }}>
        <Tooltip title={userUuidToNames(card.meta.likes)}>
          <AntIcon type="like" theme={liked ? 'filled' : 'outlined'} />
        </Tooltip>
        <span style={{ paddingLeft: 4 }}>{card.meta.likes.length}</span>
      </span>
      <span onClick={dislike} style={{ paddingLeft: 8, cursor: 'pointer' }}>
        <Tooltip title={userUuidToNames(card.meta.dislikes)}>
          <AntIcon type="dislike" theme={disliked ? 'filled' : 'outlined'} />
        </Tooltip>
        <span style={{ paddingLeft: 4 }}>{card.meta.dislikes.length}</span>
      </span>
      <span>
        <Button
          disabled={neededLikesCount > 0}
          className={styles.stateButton}
          ghost={neededLikesCount === 0}
          danger
          size="small"
          onClick={() => updateState(CardState.Approved)}
        >
          {`Approve!${neededLikesCount > 0 ? ` (need ${neededLikesCount} more likes)` : ''}`}
        </Button>
      </span>
    </div>
  );

  let view: ReactElement | null = <div />;
  if (card.meta.state === CardState.Draft) view = null;
  if (card.meta.state === CardState.Rate) view = rateView;
  // view = rateView;

  return (
    <Modal
      className={styles.modalCardViewWrapper}
      wrapClassName="card-view"
      classNames={{ mask: 'card-view' }}
      title={`View ${card.name}`}
      open={visible}
      onOk={hide}
      onCancel={hide}
    >
      <div
        className={styles.view}
        style={{
          width: rowLayout ? fullCardWidth : modalMaxWidth,
          flexDirection: rowLayout ? 'column' : 'row',
        }}
      >
        <div
          className={`${styles.modalCardGroupWrapper} ${
            faces.length === 2
              ? styles.modalCardGroupWrapperDouble
              : styles.modalCardGroupWrapperSingle
          }`}
          style={{
            width: fullCardWidth,
          }}
        >
          <RotateToMouse
            style={{
              width: fullCardWidth,
            }}
          >
            {faces.map((face, index) => (
              <div
                key={`${face.name}-${index}`}
                className={styles.modalCardWrapper}
                style={{
                  width: singleCardWidth,
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
          </RotateToMouse>
        </div>
        <div
          className={styles.annotationView}
          style={{
            width: `${annotationWidth}px`,
            height: `${annotationHeight}px`,
          }}
        >
          <AnnotationList
            split={rowLayout}
            annotations={annotations}
            headerExtra={releaseForRatingButton}
            createAnnotation={(content, author) =>
              createAnnotation(dispatch, content, author, card.uuid)
            }
          >
            {view != null ? (
              <Card size="small" variant="borderless" className={styles.cardComment}>
                {view}
              </Card>
            ) : null}
          </AnnotationList>
        </div>
      </div>
    </Modal>
  );
};

export default BigCardRenderModal;
