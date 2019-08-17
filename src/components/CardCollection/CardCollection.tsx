import React, { useState } from 'react';

import { FixedSizeGrid as Grid } from 'react-window';

import AutoSizer from 'react-virtualized-auto-sizer';

import CardInterface from '../../interfaces/CardInterface';
import Cell from './Cell';

export interface CardCollectionInterface {
  cards?: CardInterface[];
  editCard: (id: string) => void;
  downloadImage: (id: string) => void;
  downloadJson: (id: string) => void;
  currentEditId: string;
  columns: number;
  seenCardUuids: { [key: string]: boolean };
  addSeenCard: (uuid: string) => void;
}

export interface BackConfigInterface {
  [key: string]: boolean;
}

const CardCollection = ({
  cards = [],
  editCard,
  downloadJson,
  currentEditId,
  columns,
  seenCardUuids,
  addSeenCard
}: CardCollectionInterface) => {
  const [showBackFaceConfig, setShowBackFaceConfig] = useState<BackConfigInterface>({});

  const toggleShowBackConfig = (id: string) => {
    const newConfig = { ...showBackFaceConfig };
    newConfig[id] = !newConfig[id];
    setShowBackFaceConfig(newConfig);
  };

  return (
    <AutoSizer>
      {({ height, width }) => {
        const columnWidth: number = width / columns;
        const columnHeight: number = (columnWidth / 488) * 680;
        const rows: number = Math.ceil(cards.length / columns);

        const data = {
          cards,
          columnCount: columns,
          seenCardUuids,
          currentEditId,
          addSeenCard,
          downloadCard: downloadJson,
          toggleShowBackConfig,
          editCard,
          width: columnWidth - 4,
          showBackFaceConfig
        };

        return (
          <Grid
            columnWidth={columnWidth}
            rowHeight={columnHeight}
            columnCount={columns}
            rowCount={rows}
            height={height}
            width={width + 22}
            itemData={data}
          >
            {Cell}
          </Grid>
        );
      }}
    </AutoSizer>
  );
};

export default CardCollection;
