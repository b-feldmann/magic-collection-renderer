import React from 'react';
import { List } from 'antd';
import DeckListItem from './DeckListItem';
import DeckIdentifierInterface from '../../DeckIdentifierInterface';

interface DeckListProps {
  decks: DeckIdentifierInterface[];
}

const DeckList = ({ decks }: DeckListProps) => (
  <List
    // bordered
    // header="Found Decks:"
    dataSource={decks}
    renderItem={(item: DeckIdentifierInterface) => (
      <DeckListItem name={item.name} uuid={item.uuid} cover={item.cover} />
    )}
  />
);

export default DeckList;
