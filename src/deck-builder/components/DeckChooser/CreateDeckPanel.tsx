import React, { useContext, useState } from 'react';
import { Avatar, Button, Col, Form, Input, Row, Select } from 'antd';
import uuidV5 from 'uuid/v5';
import searchCard from '../../cardSearcher';
import { createDeck } from '../../actions/deckActions';
import { Store, StoreType } from '../../store';
import SmallCardInterface from '../../SmallCardInterface';

const { Option } = Select;

type Suggestions = {
  name: string;
  cover: string;
};

interface CreateDeckPanelProps {
  hash: string;
}

const CreateDeckPanel = ({ hash }: CreateDeckPanelProps) => {
  const [newDeckName, setNewDeckName] = useState<string>('');
  const [commanderSuggestions, setCommanderSuggestions] = useState<SmallCardInterface[]>([]);
  const [foundCommander, setFoundCommander] = useState<SmallCardInterface>();
  const [cover, setCover] = useState<string>('');

  const { dispatch } = useContext<StoreType>(Store);

  return (
    <Form>
      <Row>
        <Col span={12}>
          <p>Deck Name:</p>
          <Input
            size="large"
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
            placeholder="My Awesome Brawl Deck"
          />
        </Col>
        <Col span={12}>
          <p>Commander:</p>
          <Select
            size="large"
            showSearch
            value={foundCommander ? foundCommander.name : ''}
            placeholder="Commander"
            defaultActiveFirstOption={false}
            showArrow={false}
            filterOption={false}
            onSearch={value => {
              if (value.length <= 1) return;
              searchCard(
                `(e:akh or e:hou or e:xln or e:rix or e:dom or e:m19 or e:grn or e:rna or e:war or e:m20 or e:eld) ((t:creature t:legendary) or t:planeswalker) ${value}`,
                cards => setCommanderSuggestions(cards)
              );
            }}
            onChange={(value: string) => {
              setFoundCommander(commanderSuggestions.find(cards => cards.name === value));
              const suggestion = commanderSuggestions.find(s => s.name === value);
              setCover(suggestion ? suggestion.art : '');
            }}
            notFoundContent={null}
          >
            {commanderSuggestions.map(suggestion => (
              <Option key={suggestion.name}>
                <Avatar shape="square" src={suggestion.art} />
                {suggestion.name}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      <Button
        type="primary"
        disabled={newDeckName.length === 0 || !foundCommander}
        onClick={() => {
          if (!foundCommander) return;
          createDeck(dispatch, newDeckName, foundCommander, cover, hash);
          setNewDeckName('');
          setFoundCommander(undefined);
          setCommanderSuggestions([]);
        }}
      >
        Create new Deck
      </Button>
    </Form>
  );
};

export default CreateDeckPanel;
