import React, { useState } from 'react';

import { FixedSizeGrid as Grid } from 'react-window';

import AutoSizer from 'react-virtualized-auto-sizer';

import CardInterface from '../../interfaces/CardInterface';
import Cell from './Cell';

import styles from './styles.module.scss';

export interface CardCollectionInterface {
  cards?: CardInterface[];
  editCard: (id: string) => void;
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
  editCard,
  downloadJson = () => {},
  currentEditId,
  colSpanSetting = 4,
  seenCardUuids,
  addSeenCard,
  mobile
}: CardCollectionInterface) => {
  const [showBackFaceConfig, setShowBackFaceConfig] = useState<{ [key: string]: boolean }>({});

  const toggleShowBackConfig = (id: string) => {
    const newConfig = { ...showBackFaceConfig };
    newConfig[id] = !newConfig[id];
    setShowBackFaceConfig(newConfig);
  };

  return (
    <AutoSizer>
      {({ height, width }) => {
        let columns = 6;
        if (colSpanSetting === -1) {
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

        const columnWidth: number = width / columns;
        const columnHeight: number = (columnWidth / 720.0) * 1020.0;
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
          showBackFaceConfig,
          mobile
        };

        return (
          <Grid
            className={styles.collection}
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
