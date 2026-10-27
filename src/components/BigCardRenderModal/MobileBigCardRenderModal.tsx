import React, { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Button, ConfigProvider, Modal } from 'antd';

import CardInterface from '../../interfaces/CardInterface';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import styles from './BigCardRenderModal.module.scss';
import { NonMemoCardRender as CardRender } from '../TemplatingCardRender/index';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
import FavoriteHeart from '../FavoriteHeart/FavoriteHeart';
import AntIcon from '../AntIcon/AntIcon';

// Size the controls themselves, including their tags, text and circle buttons,
// rather than stretching only the outer DOM nodes with mobile CSS.
const MOBILE_EDITOR_THEME = {
  token: {
    controlHeight: 44,
    controlHeightSM: 44,
    fontSize: 16,
    fontSizeSM: 16,
  },
};

interface MobileBigCardRenderModalProps {
  card: CardInterface;
  visible: boolean;
  hide: () => void;
  collectionNumber: number;
  collectionSize: number;
  width: number;
  height: number;
  variantNavigation?: React.ReactNode;
  mobileEditor?: React.ReactNode;
  mobileEditorOpen?: boolean;
  onEditCard?: () => void;
  onHideEditor?: () => void;
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
  mobileEditor,
  mobileEditorOpen = false,
  onEditCard,
  onHideEditor,
  children,
}: MobileBigCardRenderModalProps) => {
  const editorId = useId();
  const closeFromHistory = useEffectEvent(hide);
  const historySession = useRef<{ id: string; active: boolean; backPending: boolean } | null>(null);
  const scrollContainer = useCallback(
    (container: HTMLDivElement | null) => {
      if (!visible || !container) return;

      const updateShadows = () => {
        // Allow for fractional scroll positions and mobile overscroll.
        const overflows = container.scrollHeight > container.clientHeight + 1;
        container.dataset.scrollTop = String(overflows && container.scrollTop > 1);
        container.dataset.scrollBottom = String(
          overflows && container.scrollHeight - container.clientHeight - container.scrollTop > 1,
        );
      };
      updateShadows();
      container.addEventListener('scroll', updateShadows, { passive: true });
      const observer =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateShadows) : null;
      observer?.observe(container);
      // Content can resize independently of the viewport (editor, card art, comments).
      for (const child of container.children) observer?.observe(child);
      return () => {
        container.removeEventListener('scroll', updateShadows);
        observer?.disconnect();
      };
    },
    [visible],
  );

  useEffect(() => {
    if (!visible) return;
    const session = (historySession.current ??= {
      id: crypto.randomUUID(),
      active: false,
      backPending: false,
    });
    session.active = true;
    const pushModalEntry = () => {
      // Keep the URL and any existing page state; Back consumes only this entry.
      window.history.pushState({ ...window.history.state, mobileCardModal: session.id }, '');
    };
    if (window.history.state?.mobileCardModal !== session.id) {
      session.backPending = false;
      pushModalEntry();
    }
    const onPopState = () => {
      if (session.backPending) {
        session.backPending = false;
        // A new opening can arrive before the previous dismissal's async Back.
        // Restore its entry rather than closing the newly opened modal.
        if (session.active) pushModalEntry();
        return;
      }
      if (session.active && window.history.state?.mobileCardModal !== session.id) {
        session.active = false;
        closeFromHistory();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      session.active = false;
      window.removeEventListener('popstate', onPopState);
      // Defer to let StrictMode's effect replay reuse the same entry. A normal
      // dismissal/unmount consumes it, but a native Back must not go back twice.
      queueMicrotask(() => {
        if (
          !session.active &&
          !session.backPending &&
          window.history.state?.mobileCardModal === session.id
        ) {
          session.backPending = true;
          window.history.back();
        }
      });
    };
  }, [visible]);

  const closeOnBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) hide();
  };

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

  const sideMargin = 20;
  const hOffset = variantNavigation || mobileEditor ? 84 : 30;

  const dimFactor = CARD_WIDTH / CARD_HEIGHT;

  const modalMaxWidth = width - sideMargin * 2;
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
        ref={scrollContainer}
        className={styles.mobilePositioner}
        onClick={closeOnBackgroundClick}
        style={{
          width: modalMaxWidth,
        }}
      >
        <div className={styles.mobileFaces} onClick={closeOnBackgroundClick}>
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
        {(card.back || variantNavigation || mobileEditor) && (
          <div
            className={styles.mobileCardControls}
            role="group"
            aria-label="Card controls"
            onClick={closeOnBackgroundClick}
          >
            {mobileEditor && (
              <Button
                type="primary"
                aria-label={mobileEditorOpen ? 'Hide editor' : 'Edit card'}
                icon={<AntIcon type={mobileEditorOpen ? 'up' : 'edit'} />}
                aria-expanded={mobileEditorOpen}
                aria-controls={editorId}
                onClick={mobileEditorOpen ? onHideEditor : onEditCard}
              >
                {mobileEditorOpen ? 'Hide editor' : 'Edit card'}
              </Button>
            )}
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
        {mobileEditor && (
          <section
            id={editorId}
            aria-label="Card editor"
            className={styles.mobileEditor}
            hidden={!mobileEditorOpen}
          >
            <ConfigProvider theme={MOBILE_EDITOR_THEME}>
              <header className={styles.mobileEditorHeader}>
                <h2>Card editor</h2>
              </header>
              {mobileEditor}
            </ConfigProvider>
          </section>
        )}
        <div className={`${styles.annotationView} ${styles.mobileAnnotations}`}>{children}</div>
      </div>
    </Modal>
  );
};

export default MobileBigCardRenderModal;
