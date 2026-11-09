import React, { useContext, useEffect, useRef, useState } from 'react';
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

const HOVER_DELAY_MS = 150;
const LONG_PRESS_MS = 500;
// A finger that moves further than this is scrolling, not long-pressing.
const LONG_PRESS_MOVE_TOLERANCE = 10;
// Touch devices emulate mouseenter after a tap; ignore mouse events that soon after a touch.
const EMULATED_MOUSE_WINDOW_MS = 1000;

type RowHandlers = Pick<
  React.HTMLAttributes<HTMLElement>,
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onTouchStart'
  | 'onTouchMove'
  | 'onTouchEnd'
  | 'onTouchCancel'
  | 'onContextMenu'
>;

/**
 * Shows the rendered card in a popup for `children` (a table row): after a short hover with
 * a mouse, or after a long press on touch screens, where a tap or scroll does not open it.
 */
const CardHoverPreview = ({
  card,
  collectionNumber,
  collectionSize,
  children,
}: {
  card: CardInterface;
  collectionNumber: number;
  collectionSize: number;
  children: React.ReactElement<RowHandlers>;
}) => {
  const [openedBy, setOpenedBy] = useState<'mouse' | 'touch' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTouch = useRef(0);
  const cancelTimer = () => clearTimeout(timer.current);
  useEffect(() => cancelTimer, []);
  // A long-press preview stays open until the next touch anywhere on the page.
  useEffect(() => {
    if (openedBy !== 'touch') return undefined;
    const close = () => setOpenedBy(null);
    document.addEventListener('touchstart', close, { capture: true, passive: true });
    return () => document.removeEventListener('touchstart', close, { capture: true });
  }, [openedBy]);

  const endPress = () => {
    cancelTimer();
    touchStart.current = null;
  };
  const handlers: RowHandlers = {
    onMouseEnter: () => {
      if (Date.now() - lastTouch.current < EMULATED_MOUSE_WINDOW_MS) return;
      cancelTimer();
      timer.current = setTimeout(() => setOpenedBy('mouse'), HOVER_DELAY_MS);
    },
    onMouseLeave: () => {
      cancelTimer();
      setOpenedBy(current => (current === 'mouse' ? null : current));
    },
    onTouchStart: event => {
      lastTouch.current = Date.now();
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch) return endPress();
      touchStart.current = { x: touch.clientX, y: touch.clientY };
      cancelTimer();
      timer.current = setTimeout(() => setOpenedBy('touch'), LONG_PRESS_MS);
    },
    onTouchMove: event => {
      const start = touchStart.current;
      const touch = event.touches[0];
      if (!start || !touch) return;
      const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      if (moved > LONG_PRESS_MOVE_TOLERANCE) endPress();
    },
    onTouchEnd: () => {
      lastTouch.current = Date.now();
      endPress();
    },
    onTouchCancel: endPress,
    // Mobile browsers open their own menu on a long press; the preview replaces it.
    onContextMenu: event => {
      if (Date.now() - lastTouch.current < EMULATED_MOUSE_WINDOW_MS) event.preventDefault();
    },
  };

  return (
    <Popover
      open={openedBy !== null}
      trigger={[]}
      placement={openedBy === 'touch' ? 'top' : 'right'}
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
      {React.cloneElement(children, handlers)}
    </Popover>
  );
};

export default CardHoverPreview;
