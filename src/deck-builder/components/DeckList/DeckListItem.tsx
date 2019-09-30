import React from 'react';
import { List, Icon, Avatar } from 'antd';
import { Link } from 'react-router-dom';

interface DeckListItemProps {
  name: string;
  cover: string;
  uuid: string;
}

const DeckListItem = ({ name, uuid, cover }: DeckListItemProps) => (
  <List.Item>
    <Avatar shape="square" src={cover} />
    {name}
    <Link to={`/deck-builder/edit/${uuid}`}>
      <Icon type="edit" twoToneColor="green" theme="twoTone" />
    </Link>
  </List.Item>
);

export default DeckListItem;
