import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Grid } from 'react-window';

import { AutoSizer } from 'react-virtualized-auto-sizer';

import CardInterface from '../../interfaces/CardInterface';
import Cell, { CellData } from './Cell';

import styles from './styles.module.scss';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';
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
}: CardCollectionInterface) => {
  const [showBackFaceConfig, setShowBackFaceConfig] = useState<{ [key: string]: boolean }>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const groups = useMemo(() => getVariantGroups(cards, allCards), [cards, allCards]);
  const previousEditId = useRef('');

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

        // Reserve room for the vertical scrollbar so the rightmost column of
        // cards is never rendered underneath it. Only reserve the space when
        // the content actually overflows vertically (i.e. a scrollbar shows).
        // Separation from the fixed editor panel is already provided by the
        // `.collection` `margin-right` in App.module.scss (reserves the editor
        // width + an 8px gap), so no extra right gutter is needed here.
        const SCROLLBAR_WIDTH = 17;
        const unreservedColumnHeight: number = (width / columns / CARD_WIDTH) * CARD_HEIGHT;
        const hasVerticalScrollbar: boolean = rows * unreservedColumnHeight > height;
        const availableWidth: number = hasVerticalScrollbar ? width - SCROLLBAR_WIDTH : width;

        const columnWidth: number = availableWidth / columns;
        const columnHeight: number = (columnWidth / CARD_WIDTH) * CARD_HEIGHT;

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
          width: columnWidth - 4,
          showBackFaceConfig,
          mobile,
        };

        return (
          <Grid
            className={styles.collection}
            cellComponent={Cell}
            cellProps={data}
            columnCount={columns}
            columnWidth={columnWidth}
            rowCount={rows}
            rowHeight={columnHeight}
            style={{ height, width }}
          />
        );
      }}
    />
  );
};

export default CardCollection;
