import React from 'react';
import { Button, Popover, Table } from 'antd';
import CardInterface from '../../interfaces/CardInterface';
import cardToColor from '../CardRender/cardToColor';
import { CardMainType } from '../../interfaces/enums';

import styles from './collectionStats.module.scss';

const CollectionStats = ({ collection }: { collection: CardInterface[] }) => {
  const cardTypes = {};
  Object.values(CardMainType).forEach(key => {
    // @ts-ignore
    cardTypes[key] = 0;
  });

  const stats = {
    white: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    blue: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    black: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    red: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    green: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    colorless: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    gold: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes },
    land: { Count: 0, Common: 0, Uncommon: 0, Rare: 0, 'Mythic Rare': 0, ...cardTypes }
  };

  collection.forEach(card => {
    const { color } = cardToColor(card.front.cardMainType, card.manaCost);
    // @ts-ignore
    stats[color][card.rarity] += 1;
    // @ts-ignore
    stats[color][card.front.cardMainType] += 1;
    // @ts-ignore
    stats[color].Count += 1;
  });

  const data = [];
  data.push({ Color: 'White', ...stats.white });
  data.push({ Color: 'Blue', ...stats.blue });
  data.push({ Color: 'Black', ...stats.black });
  data.push({ Color: 'Red', ...stats.red });
  data.push({ Color: 'Green', ...stats.green });
  data.push({ Color: 'Colorless', ...stats.colorless });
  data.push({ Color: 'Gold', ...stats.gold });
  data.push({ Color: 'Land', ...stats.land });

  const columns: { title: string; dataIndex: string; key: string }[] = [];
  const addColumn = (key: string) => columns.push({ title: key, dataIndex: key, key });
  addColumn('Color');
  addColumn('Count');
  addColumn('Common');
  addColumn('Uncommon');
  addColumn('Rare');
  addColumn('Mythic Rare');
  Object.values(CardMainType).forEach(key => addColumn(key));

  const content = <Table size="small" dataSource={data} columns={columns} />;

  return (
    <Popover content={content} title="Collection Stats">
      <Button type="primary" className={styles.stats}>
        {`${collection.length} Cards. Hover Here`}
      </Button>
    </Popover>
  );
};

export default CollectionStats;
