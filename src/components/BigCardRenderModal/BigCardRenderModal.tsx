import React, { ReactElement, useContext, useEffect, useMemo, useState } from 'react';
import { Button, Card, Modal, Tooltip } from 'antd';

import AntIcon from '../AntIcon/AntIcon';

import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../TemplatingCardRender/index';
import { Store, StoreType } from '../../store';
import useWindowDimensions from '../../useWindowDimensions';
import AnnotationList from '../AnnotationList/AnnotationList';
import { createAnnotation } from '../../actions/annotationActions';
import { CardState } from '../../interfaces/enums';
import { updateCard, updateCardRating } from '../../actions/cardActions';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import MobileBigCardRenderModal from './MobileBigCardRenderModal';
import RotateToMouse from '../RotateToMouse/RotateToMouse';
import TrainerGalleryHolofoil from './TrainerGalleryHolofoil';
import FavoriteHeart from '../FavoriteHeart/FavoriteHeart';
import { getVariantFamily } from '../../utils/cardVariants';
import { getImage } from '../../actions/imageActions';
import { isLoadingCover } from '../../utils/cover';
import useUnreadComments from '../../useUnreadComments';

interface BigCardRenderModalProps {
  card: CardInterface;
  visible: boolean;
  hide: () => void;
  collectionNumber: number;
  collectionSize: number;
  mobile?: boolean;
  onSelectVariant?: (id: string) => void;
  mobileEditor?: React.ReactNode;
  mobileEditorOpen?: boolean;
  onEditCard?: () => void;
  onHideEditor?: () => void;
}

const BigCardRenderModal = ({
  card: openedCard,
  visible,
  hide,
  collectionNumber,
  collectionSize,
  mobile,
  onSelectVariant,
  mobileEditor,
  mobileEditorOpen,
  onEditCard,
  onHideEditor,
}: BigCardRenderModalProps) => {
  const { annotationAccessor, currentUser, user, dispatch, cards } = useContext<StoreType>(Store);
  const family = useMemo(() => getVariantFamily(openedCard, cards), [openedCard, cards]);
  const [selection, setSelection] = useState({
    openedId: openedCard.uuid,
    visible,
    selectedId: openedCard.uuid,
  });
  const newSession = selection.openedId !== openedCard.uuid || selection.visible !== visible;
  // Reset synchronously on a new opening, without remounting the modal/close animation.
  if (newSession) {
    setSelection({ openedId: openedCard.uuid, visible, selectedId: openedCard.uuid });
  }
  const selectedId = newSession ? openedCard.uuid : selection.selectedId;
  const card = family.find(member => member.uuid === selectedId) || openedCard;
  const variantIndex = family.findIndex(member => member.uuid === card.uuid);

  useEffect(() => {
    if (!visible) return;
    if (isLoadingCover(card.front.cover)) getImage(dispatch, card, 0);
    if (isLoadingCover(card.back?.cover)) getImage(dispatch, card, 1);
  }, [card, dispatch, visible]);

  const switchVariant = (offset: number) => {
    const next = family[(variantIndex + offset + family.length) % family.length];
    if (onSelectVariant) onSelectVariant(next.uuid);
    else setSelection({ openedId: openedCard.uuid, visible, selectedId: next.uuid });
  };
  const variantNavigation =
    family.length > 1 ? (
      <div className={styles.variantNavigation} role="group" aria-label="Card variants">
        <Button size="small" aria-label="Previous variant" onClick={() => switchVariant(-1)}>
          ‹
        </Button>
        <span aria-live="polite">
          {variantIndex + 1} / {family.length}
        </span>
        <Button size="small" aria-label="Next variant" onClick={() => switchVariant(1)}>
          ›
        </Button>
      </div>
    ) : null;

  // O(1) uuid -> name lookups instead of an O(n) `_.find` per uuid.
  const userNameByUuid = useMemo(() => new Map(user.map(u => [u.uuid, u.name])), [user]);

  const annotations = annotationAccessor[card.uuid] || [];
  useUnreadComments(annotations, visible);

  // Mark the back face so card renderers suppress front-only chrome
  // (e.g. the mana cost) on it, matching CardCollection's Cell.
  const faces: CardFaceInterface[] = [card.front];
  if (card.back)
    faces.push({
      ...card.back,
      backFace: true,
    });

  const { width, height } = useWindowDimensions();

  const rowLayout = faces.length === 2;

  const wOffset = 50;
  const hEditorSpace = rowLayout ? 200 : 0;
  const hOffset = 200;

  const dimFactor = CARD_WIDTH / CARD_HEIGHT;

  const modalMaxWidth = (width / 100) * 62.5 - wOffset;
  // Match App.module.scss's fixed sidebar/editor widths and their outer gaps.
  // Only the left sidebar is hidden below 900px; the desktop editor remains.
  const sidebarSpace = width >= 900 ? 288 + 16 : 0;
  const editorSpace = 516 + 16;
  const desktopViewWidth = Math.max(0, width - sidebarSpace - editorSpace - 32);
  const modalMaxHeight = height - hOffset - hEditorSpace;
  // Reserve room for comments beside a single face, while keeping the previous
  // card size on wide screens. Both faces of a double-faced card share the band.
  const singleFaceSpace = Math.max(0, desktopViewWidth - 16);
  const modalSingleCardWidth = Math.max(
    0,
    Math.min(
      modalMaxWidth,
      modalMaxHeight * dimFactor,
      singleFaceSpace - Math.min(320, singleFaceSpace * 0.4),
    ),
  );
  const modalDoubleCardWidth = Math.max(
    0,
    Math.min(modalMaxWidth, modalMaxHeight * dimFactor * 2, desktopViewWidth),
  );

  // Decide from the side-by-side size so enlarging the card after stacking
  // cannot cause the layout to flip back on the next render.
  const stackSingleCard = !rowLayout && modalSingleCardWidth / dimFactor <= height / 2;
  const stackedLayout = rowLayout || stackSingleCard;
  // Keep 16px viewport gutters and account for the variant controls above chat.
  // Reserve half the screen for chat before assigning the remaining card space.
  const stackedAvailableHeight = Math.max(0, height - 32 - (variantNavigation ? 40 : 0));
  const stackedCardMaxHeight = Math.max(0, stackedAvailableHeight - height / 2 - 16);
  const responsiveSingleCardWidth = stackSingleCard
    ? Math.max(0, Math.min(modalMaxWidth, desktopViewWidth, stackedCardMaxHeight * dimFactor))
    : modalSingleCardWidth;
  const singleCardWidth = rowLayout ? modalDoubleCardWidth / 2 : responsiveSingleCardWidth;
  const fullCardWidth = rowLayout ? modalDoubleCardWidth : responsiveSingleCardWidth;
  const cardHeight = singleCardWidth / dimFactor;

  const annotationWidth = stackedLayout ? fullCardWidth : desktopViewWidth - singleCardWidth - 16;
  const annotationHeight = stackSingleCard
    ? Math.max(height / 2, stackedAvailableHeight - cardHeight - 16)
    : rowLayout
      ? Math.max(0, height - hOffset - cardHeight)
      : cardHeight;

  const updateState = (newState: CardState) => {
    const updatedCard = {
      ...card,
      meta: {
        ...card.meta,
        state: newState,
        ...(newState === CardState.Draft ? { likes: [], dislikes: [] } : {}),
      },
    };
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

  // Half the collection's users, excluding the creator, rounded up.
  const requiredLikes = Math.ceil(Math.max(user.length - 1, 0) / 2);
  const neededLikesCount = Math.max(
    requiredLikes - card.meta.likes.length + card.meta.dislikes.length,
    0,
  );

  const toggleRating = (rating: 'likes' | 'dislikes') => {
    const alreadySelected = card.meta[rating].includes(currentUser.uuid);
    const nextRating = alreadySelected ? null : rating === 'likes' ? 'like' : 'dislike';
    updateCardRating(dispatch, card.uuid, currentUser.uuid, nextRating).catch(() => {});
  };

  const userUuidToNames = (uuids: string[]) =>
    uuids.map(uuid => userNameByUuid.get(uuid) || '').join(', ');

  const rateView = (
    <div className={styles.ratingPanel} role="group" aria-label="Card rating">
      <div className={styles.ratingVotes}>
        <Tooltip title={userUuidToNames(card.meta.likes)}>
          <button
            type="button"
            className={styles.ratingVote}
            aria-label={`Like (${card.meta.likes.length})`}
            aria-pressed={liked}
            onClick={() => toggleRating('likes')}
          >
            <AntIcon type="like" theme={liked ? 'filled' : 'outlined'} />
            <span>{card.meta.likes.length}</span>
          </button>
        </Tooltip>
        <Tooltip title={userUuidToNames(card.meta.dislikes)}>
          <button
            type="button"
            className={`${styles.ratingVote} ${styles.ratingVoteDislike}`}
            aria-label={`Dislike (${card.meta.dislikes.length})`}
            aria-pressed={disliked}
            onClick={() => toggleRating('dislikes')}
          >
            <AntIcon type="dislike" theme={disliked ? 'filled' : 'outlined'} />
            <span>{card.meta.dislikes.length}</span>
          </button>
        </Tooltip>
      </div>
      <div className={styles.ratingActions}>
        <Button
          disabled={user.length === 0 || neededLikesCount > 0}
          className={styles.stateButton}
          ghost={neededLikesCount === 0}
          danger
          size="small"
          onClick={() => updateState(CardState.Approved)}
        >
          {`Approve!${neededLikesCount > 0 ? ` (need ${neededLikesCount} more)` : ''}`}
        </Button>
        <Button
          className={styles.stateButton}
          size="small"
          onClick={() => updateState(CardState.Draft)}
        >
          Return to Draft
        </Button>
      </div>
    </div>
  );

  let view: ReactElement | null = null;
  if (card.meta.state === CardState.Draft) view = null;
  if (card.meta.state === CardState.Rate) view = rateView;
  // view = rateView;

  const annotationList = (
    <AnnotationList
      key={card.uuid}
      split={!mobile && rowLayout}
      annotations={annotations}
      headerExtra={releaseForRatingButton}
      createAnnotation={(content, author) => createAnnotation(dispatch, content, author, card.uuid)}
    >
      {view != null ? (
        <Card size="small" variant="borderless" className={styles.cardComment}>
          {view}
        </Card>
      ) : null}
    </AnnotationList>
  );

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
        variantNavigation={variantNavigation}
        mobileEditor={mobileEditor}
        mobileEditorOpen={mobileEditorOpen}
        onEditCard={onEditCard}
        onHideEditor={onHideEditor}
      >
        {annotationList}
      </MobileBigCardRenderModal>
    );

  return (
    <Modal
      className={styles.modalCardViewWrapper}
      style={{ left: (sidebarSpace - editorSpace) / 2 }}
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
          width: stackedLayout ? fullCardWidth : desktopViewWidth,
          flexDirection: stackedLayout ? 'column' : 'row',
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
            key={card.uuid}
            style={{
              width: fullCardWidth,
            }}
          >
            {faces.map((face, index) => (
              <TrainerGalleryHolofoil
                key={`${face.name}-${index}`}
                className={styles.modalCardWrapper}
                cardWidth={singleCardWidth}
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
                <FavoriteHeart favorite={card.favorite} />
              </TrainerGalleryHolofoil>
            ))}
          </RotateToMouse>
          {variantNavigation}
        </div>
        <div
          className={styles.annotationView}
          style={{
            width: `${annotationWidth}px`,
            height: `${annotationHeight}px`,
          }}
        >
          {annotationList}
        </div>
      </div>
    </Modal>
  );
};

export default BigCardRenderModal;
