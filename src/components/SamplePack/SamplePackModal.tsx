import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Button from 'antd/es/button';
import Modal from 'antd/es/modal';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import CardRender from '../TemplatingCardRender/index';
import CardHoverPreview from '../CollectionStats/CardHoverPreview';
import CardInterface from '../../interfaces/CardInterface';
import { Store } from '../../store';
import { getImage } from '../../actions/imageActions';
import { isLoadingCover } from '../../utils/cover';
import { openSamplePack, PackCard, PackSlot, SamplePack } from '../../utils/samplePack';
import { packLayout, PackLayout } from './packLayout';
import styles from './SamplePackModal.module.scss';

// Used until the space for the pack is measured (and where nothing can be measured).
const FALLBACK_LAYOUT: PackLayout = { columns: 5, cardWidth: 180 };
const MOBILE_FALLBACK_LAYOUT: PackLayout = { columns: 3, cardWidth: 110 };
const CARDS_AREA_PADDING = 6;
// Space above and below the modal (see .modal).
const MODAL_MARGIN = 16;
const PREVIEW_WIDTH = 400;

const SLOT_LABELS: Record<PackSlot, string> = {
  'Mythic Rare': 'Mythic rare',
  Rare: 'Rare',
  Uncommon: 'Uncommon',
  Common: 'Common',
  'Basic Land': 'Basic land',
};

interface PackCardViewProps {
  entry: PackCard;
  // The card as it is in the store now: uploaded covers load after the pack was opened.
  card: CardInterface;
  width: number;
  collectionNumber: number;
  collectionSize: number;
}

const PackCardView = ({
  entry,
  card,
  width,
  collectionNumber,
  collectionSize,
}: PackCardViewProps) => {
  const { dispatch } = useContext(Store);
  // Uploaded art loads on demand, as in the collection grid.
  useEffect(() => {
    if (isLoadingCover(card.front.cover)) getImage(dispatch, card, 0);
  }, [card, dispatch]);

  return (
    <CardHoverPreview
      card={card}
      collectionNumber={collectionNumber}
      collectionSize={collectionSize}
      previewWidth={PREVIEW_WIDTH}
    >
      <li className={styles.card} aria-label={`${card.name}, ${SLOT_LABELS[entry.slot]}`}>
        <CardRender
          containerWidth={width}
          {...card.front}
          cardID={card.uuid}
          rarity={card.rarity}
          manaCost={card.manaCost}
          creator={card.creator?.name}
          collectionNumber={collectionNumber}
          collectionSize={collectionSize}
        />
        <span className={styles.slot} data-slot={entry.slot} aria-hidden="true">
          {SLOT_LABELS[entry.slot]}
        </span>
      </li>
    </CardHoverPreview>
  );
};

const PackContents = ({
  cards,
  allCards,
  mobile,
}: {
  cards: CardInterface[];
  allCards: CardInterface[];
  mobile: boolean;
}) => {
  // A new pack each time the modal opens (it's unmounted while closed) or on "Open another".
  const [pack, setPack] = useState<SamplePack>(() => openSamplePack(cards, allCards));
  const numbers = useMemo(
    () => new Map(cards.map((card, index) => [card.uuid, index + 1])),
    [cards],
  );
  // The basic land can come from outside the filters: it's numbered within the whole collection.
  const allNumbers = useMemo(
    () => new Map(allCards.map((card, index) => [card.uuid, index + 1])),
    [allCards],
  );
  // The pack keeps the cards it was opened with; show their current state, e.g. a loaded cover.
  const current = useMemo(() => new Map(allCards.map(card => [card.uuid, card])), [allCards]);
  // The cards shrink or grow so the whole pack fits in the modal without scrolling.
  const cardsRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PackLayout>(
    mobile ? MOBILE_FALLBACK_LAYOUT : FALLBACK_LAYOUT,
  );
  const count = pack.cards.length;
  useLayoutEffect(() => {
    const element = cardsRef.current;
    const dialog = element?.closest<HTMLElement>('.ant-modal-container');
    if (!element || !dialog) return undefined;
    const measure = () => {
      // The modal is as high as its content, so the height left for the cards is the viewport
      // minus the modal's margins and everything in it but the cards (title, toolbar, notes).
      // scrollHeight: the dialog's whole content, also while its max-height cuts it off.
      const chrome = dialog.scrollHeight - element.offsetHeight;
      const padding = 2 * CARDS_AREA_PADDING;
      const width = element.clientWidth - padding;
      const height = document.documentElement.clientHeight - 2 * MODAL_MARGIN - chrome - padding;
      if (width <= 0 || height <= 0) return;
      const next = packLayout(count, width, height);
      setLayout(previous =>
        previous.columns === next.columns && previous.cardWidth === next.cardWidth
          ? previous
          : next,
      );
    };
    measure();
    // The area changes width with the window, the dialog height when the notes above wrap.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(dialog);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [count]);
  const width = layout.cardWidth;

  return (
    <div className={styles.pack}>
      <div className={styles.toolbar}>
        <p className={styles.summary}>
          {pack.cards.length} cards opened from the {pack.poolSize} draftable cards shown in the
          current tab and filters. {mobile ? 'Long-press' : 'Hover'} a card to see it larger.
        </p>
        <Button icon={<ReloadOutlined />} onClick={() => setPack(openSamplePack(cards, allCards))}>
          Open another pack
        </Button>
      </div>
      {pack.shortfalls.length > 0 && (
        <ul className={styles.shortfalls} aria-label="Missing cards">
          {pack.shortfalls.map(shortfall => (
            <li key={shortfall}>{shortfall}</li>
          ))}
        </ul>
      )}
      {/* One grid in pack order (rare, uncommons, commons, land), sized to fit in view. */}
      <div ref={cardsRef} className={styles.cardsArea}>
        <ul
          className={styles.cards}
          aria-label="Pack"
          style={
            {
              '--pack-card-width': `${width}px`,
              '--pack-columns': layout.columns,
            } as React.CSSProperties
          }
        >
          {pack.cards.map(entry => {
            const shown = numbers.get(entry.card.uuid);
            return (
              <PackCardView
                key={entry.card.uuid}
                entry={entry}
                card={current.get(entry.card.uuid) ?? entry.card}
                width={width}
                collectionNumber={shown ?? allNumbers.get(entry.card.uuid) ?? 0}
                collectionSize={shown ? cards.length : allCards.length}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
};

interface SamplePackModalProps {
  open: boolean;
  onClose: () => void;
  // The cards to open the pack from: the active tab and filters.
  cards: CardInterface[];
  // The whole collection, to count variants once.
  allCards?: CardInterface[];
  mobile?: boolean;
}

/** Opens a random draft booster from the set, to see what a pack of it looks like. */
const SamplePackModal = ({
  open,
  onClose,
  cards,
  allCards = cards,
  mobile = false,
}: SamplePackModalProps) => (
  <Modal
    open={open}
    onCancel={onClose}
    footer={null}
    title="Sample draft pack"
    width={mobile ? '100%' : 'min(1800px, 96vw)'}
    destroyOnHidden
    className={styles.modal}
  >
    {open && <PackContents cards={cards} allCards={allCards} mobile={mobile} />}
  </Modal>
);

export default SamplePackModal;
