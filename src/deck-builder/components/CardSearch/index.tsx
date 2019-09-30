import React, { useEffect, useState } from 'react';
import { Avatar, Input, List, Pagination, Popover } from 'antd';
import AutoSizer from 'react-virtualized-auto-sizer';

import SmallCardInterface from '../../SmallCardInterface';
import { injectManaIcons } from '../../../custom-set/utils/injectUtils';

import styles from './CardSearch.module.scss';
import searchCard from '../../cardSearcher';

const { Search } = Input;

interface CardSearchProps {
  filter?: string;
  addCard: (card: SmallCardInterface) => void;
  hiddenCards: SmallCardInterface[];
}

const CardSearch = ({ filter, addCard, hiddenCards }: CardSearchProps) => {
  const [suggestions, setSuggestions] = useState<SmallCardInterface[]>([]);
  const [searchString, setSearchString] = useState<string>('');

  useEffect(() => {
    if (searchString.length < 3) return;

    const sets =
      '(e:akh or e:hou or e:xln or e:rix or e:dom or e:m19 or e:grn or e:rna or e:war or e:m20 or e:eld)';
    const oracle = `${searchString
      .split(' ')
      .map(search => `o:${search}`)
      .join(' ')}`;

    const search = `${sets} ${filter || ''} (${oracle} or ${searchString} or t:${searchString})`;
    searchCard(search, setSuggestions);
  }, [searchString]);

  const listItemHeight = 73;
  const paginationHeight = 80;

  return (
    <AutoSizer>
      {({ height }) => (
        <div className={styles.cardSearch}>
          <Search
            placeholder="Card title or text"
            onSearch={value => setSearchString(value)}
            enterButton
          />
          {/* <Input onChange={e => setSearchString(e.target.value)} value={searchString} /> */}
          <List
            pagination={
              suggestions.length > 0 && {
                position: 'top',
                pageSize: Math.floor((height - paginationHeight) / listItemHeight)
              }
            }
            className={styles.list}
            itemLayout="horizontal"
            dataSource={suggestions.filter(
              suggestion => !hiddenCards.find(s => s.id === suggestion.id)
            )}
            renderItem={card => (
              <List.Item key={`searched-card:${card.name}`}>
                <List.Item.Meta
                  className={styles.listMeta}
                  avatar={
                    <Popover content={<img src={card.cover} alt="" width={300} />}>
                      <Avatar size="large" shape="square" src={card.art} />
                    </Popover>
                  }
                  title={
                    <div className={styles.listTitle}>
                      <a href="#" onClick={() => addCard(card)}>
                        {card.name}
                      </a>
                      {injectManaIcons(card.mana_cost ? card.mana_cost.replace(/\//g, '') : '')}
                      <span>{card.type_line}</span>
                      {card.power && card.toughness && (
                        <span>{`[${card.power}/${card.toughness}]`}</span>
                      )}
                      {card.loyalty && <span>{`[${card.loyalty} Loyalty]`}</span>}
                    </div>
                  }
                  description={<div className={styles.cardText}>{card.oracle_text}</div>}
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </AutoSizer>
  );
};

export default CardSearch;
