import React, { useContext, useEffect } from 'react';
import { Popover } from 'antd';
import CardRender from '../TemplatingCardRender/index';
import CardInterface from '../../interfaces/CardInterface';
import { Store } from '../../store';
import { getImage } from '../../actions/imageActions';
import { isLoadingCover } from '../../utils/cover';
import styles from './collectionStats.module.scss';

const PREVIEW_WIDTH = 280;

const RenderedCard = ({
  card,
  collectionNumber,
  collectionSize,
}: {
  card: CardInterface;
  collectionNumber: number;
  collectionSize: number;
}) => {
  const { dispatch } = useContext(Store);
  // Covers load lazily; fetch it when the preview opens, as the collection grid does.
  useEffect(() => {
    if (isLoadingCover(card.front.cover)) getImage(dispatch, card, 0);
  }, [card, dispatch]);
  return (
    <div className={styles.cardPreview} aria-label={`Preview of ${card.name}`} role="img">
      <CardRender
        containerWidth={PREVIEW_WIDTH}
        {...card.front}
        cardID={card.uuid}
        rarity={card.rarity}
        manaCost={card.manaCost}
        creator={card.creator?.name}
        collectionNumber={collectionNumber}
        collectionSize={collectionSize}
      />
    </div>
  );
};

/** Shows the rendered card in a popup while the pointer is over `children` (a table row). */
const CardHoverPreview = ({
  card,
  collectionNumber,
  collectionSize,
  children,
}: {
  card: CardInterface;
  collectionNumber: number;
  collectionSize: number;
  children: React.ReactElement;
}) => (
  <Popover
    trigger="hover"
    placement="right"
    mouseEnterDelay={0.15}
    destroyOnHidden
    classNames={{ root: styles.cardPreviewPopover }}
    content={
      <RenderedCard
        card={card}
        collectionNumber={collectionNumber}
        collectionSize={collectionSize}
      />
    }
  >
    {children}
  </Popover>
);

export default CardHoverPreview;
