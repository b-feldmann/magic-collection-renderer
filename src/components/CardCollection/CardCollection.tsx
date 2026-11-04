import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Grid, useGridCallbackRef } from 'react-window';

import { AutoSizer } from 'react-virtualized-auto-sizer';

import CardInterface from '../../interfaces/CardInterface';
import Cell, { CellData } from './Cell';

import styles from './styles.module.scss';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';

// Matches the global scrollbar width in index.css.
const SCROLLBAR_WIDTH = 10;
// Space between neighbouring cards: twice the `.cardBox` padding.
const CARD_GAP = 8;
import { getVariantGroups } from '../../utils/cardVariants';

export interface CardCollectionInterface {
  cards?: CardInterface[];
  allCards?: CardInterface[];
  editCard: (id: string) => void;
  onSelectVariant?: (id: string) => void;
  downloadImage?: (id: string) => void;
  downloadJson?: (id: string) => void;
  currentEditId: string;
  colSpanSetting?: number;
  seenCardUuids: { [key: string]: boolean };
  addSeenCard: (uuid: string) => void;
  mobile?: boolean;
  bottomPadding?: number;
}

const CardCollection = ({
  cards = [],
  allCards = cards,
  editCard,
  onSelectVariant,
  downloadJson = () => {},
  currentEditId,
  colSpanSetting = 4,
  seenCardUuids,
  addSeenCard,
  mobile,
  bottomPadding = 0,
}: CardCollectionInterface) => {
  const [showBackFaceConfig, setShowBackFaceConfig] = useState<{ [key: string]: boolean }>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [scrollShadows, setScrollShadows] = useState({ top: false, bottom: false });
  const [gridRef, setGridRef] = useGridCallbackRef();
  const groups = useMemo(() => getVariantGroups(cards, allCards), [cards, allCards]);
  const previousEditId = useRef('');

  useEffect(() => {
    const grid = gridRef?.element;
    if (!grid) return;

    const update = () => {
      const top = grid.scrollTop > 1;
      const bottom = grid.scrollHeight - grid.clientHeight - grid.scrollTop > 1;
      setScrollShadows(previous =>
        previous.top === top && previous.bottom === bottom ? previous : { top, bottom },
      );
    };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(grid);
    grid.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    return () => {
      observer?.disconnect();
      grid.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [gridRef, groups.length, colSpanSetting, mobile]);

  // Follow accepted editor navigation; standalone collections can also browse locally.
  useEffect(() => {
    if (previousEditId.current === currentEditId) return;
    const group = groups.find(family => family.some(card => card.uuid === currentEditId));
    if (!group) return;
    previousEditId.current = currentEditId;
    setSelectedVariants(previous => ({ ...previous, [group[0].uuid]: currentEditId }));
  }, [currentEditId, groups]);

  const selectedIds = new Set(Object.values(selectedVariants));
  const visibleCards = groups.map(
    group =>
      group.find(card => card.uuid === selectedVariants[group[0].uuid]) ||
      group.find(card => selectedIds.has(card.uuid)) ||
      group[0],
  );

  const toggleShowBackConfig = (id: string) => {
    setShowBackFaceConfig(previous => ({ ...previous, [id]: !previous[id] }));
  };

  return (
    <AutoSizer
      renderProp={({ height: measuredHeight, width: measuredWidth }) => {
        const height = measuredHeight ?? 0;
        const width = measuredWidth ?? 0;
        if (!height || !width) return null;

        let columns = 8;
        if (colSpanSetting === -1) {
          if (width < 2300) columns = 7;
          if (width < 2000) columns = 6;
          if (width < 1700) columns = 5;
          if (width < 1500) columns = 4;
          if (width < 1100) columns = 3;
          if (width < 800) columns = 2;
        } else {
          columns = colSpanSetting;
        }

        if (mobile) {
          if (width > height) columns = 3;
          else columns = 2;
        }

        const rows: number = Math.ceil(groups.length / columns);
        const spacerRows = bottomPadding > 0 ? 1 : 0;

        // On desktop the cards span the column exactly, so they line up with the
        // statistics sheet: the cells' outer padding hangs past both edges, and the
        // scrollbar sits past the right edge, in the gap before the editor. Card size
        // doesn't depend on the scrollbar. The last cell's padding is clipped behind it.
        // Mobile has no side panels, so it only reserves room when content overflows.
        const sideOverhang: number = mobile ? 0 : CARD_GAP / 2;
        const cardHeightFor = (columnWidth: number) =>
          ((columnWidth - CARD_GAP) / CARD_WIDTH) * CARD_HEIGHT + CARD_GAP;
        const hasVerticalScrollbar: boolean =
          rows * cardHeightFor(width / columns) + bottomPadding > height;
        const gridWidth: number = mobile ? width : width + sideOverhang + SCROLLBAR_WIDTH;
        const cellsWidth: number = mobile
          ? width - (hasVerticalScrollbar ? SCROLLBAR_WIDTH : 0)
          : width + 2 * sideOverhang;

        const columnWidth: number = cellsWidth / columns;
        const columnHeight: number = cardHeightFor(columnWidth);

        const data: CellData = {
          cards: visibleCards,
          variantGroups: groups,
          selectVariant: (familyId, uuid) => {
            if (onSelectVariant) onSelectVariant(uuid);
            else setSelectedVariants(previous => ({ ...previous, [familyId]: uuid }));
          },
          columnCount: columns,
          seenCardUuids,
          currentEditId,
          addSeenCard,
          downloadCard: downloadJson,
          toggleShowBackConfig,
          editCard,
          width: columnWidth - CARD_GAP,
          showBackFaceConfig,
          mobile,
        };

        return (
          <div
            className={`${styles.scrollWrapper} ${scrollShadows.top ? styles.hasTopShadow : ''} ${scrollShadows.bottom ? styles.hasBottomShadow : ''}`}
            style={{ height, width: gridWidth, marginLeft: -sideOverhang }}
          >
            <Grid
              gridRef={setGridRef}
              className={styles.collection}
              cellComponent={Cell}
              cellProps={data}
              columnCount={columns}
              columnWidth={columnWidth}
              rowCount={rows + spacerRows}
              rowHeight={rowIndex => (rowIndex === rows ? bottomPadding : columnHeight)}
              style={{ height, width: gridWidth }}
            />
          </div>
        );
      }}
    />
  );
};

export default CardCollection;
