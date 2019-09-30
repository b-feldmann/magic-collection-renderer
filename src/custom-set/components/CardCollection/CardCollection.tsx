import React, { useContext, useState } from 'react';

import { FixedSizeGrid as Grid } from 'react-window';

import AutoSizer from 'react-virtualized-auto-sizer';

import CardInterface from '../../interfaces/CardInterface';
import Cell from './Cell';

import styles from './styles.module.scss';
import { getImage } from '../../actions/imageActions';
import { Store, StoreType } from '../../store';

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

  const { dispatch } = useContext<StoreType>(Store);

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
            onItemsRendered={({ overscanRowStartIndex, overscanRowStopIndex }) => {
              for (
                let i = overscanRowStartIndex * columns;
                i <= overscanRowStopIndex * columns;
                i += 1
              ) {
                if (data.cards[i]) {
                  const frontCover = data.cards[i].front.cover;
                  if (frontCover) {
                    if (frontCover && frontCover === 'loading') {
                      getImage(dispatch, data.cards[i], 0);
                    }
                  }
                  const { back } = data.cards[i];
                  if (back) {
                    const backCover = back.cover;
                    if (backCover) {
                      if (backCover && backCover === 'loading') {
                        getImage(dispatch, data.cards[i], 1);
                      }
                    }
                  }
                }
              }
            }}
          >
            {Cell}
          </Grid>
        );
      }}
    </AutoSizer>
  );
};

export default CardCollection;
