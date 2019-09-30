import { Card, Input, Typography, Row, Col, Tabs } from 'antd';
import uuidV5 from 'uuid/v5';
import React, { useContext, useEffect, useState } from 'react';
import styles from '../../deckbuilder.module.scss';
import DeckList from '../DeckList';
import { getDecks } from '../../actions/deckActions';
import { Store, StoreType } from '../../store';
import CreateDeckPanel from "./CreateDeckPanel";

const { Text } = Typography;
const { TabPane } = Tabs;

const ROOT_NAMESPACE = '00000000-0000-0000-0000-000000000000';

const DeckChooser = () => {
  const { decks, dispatch } = useContext<StoreType>(Store);

  const [deckKey, setDeckKey] = useState<string>('');

  useEffect(() => {
    getDecks(dispatch, uuidV5(deckKey, ROOT_NAMESPACE));
  }, [deckKey]);

  return (
    <div className={styles.deckBuilder}>
      <Card title="Deck Search">
        <Row className={styles.deckKey}>
          <Input.Password placeholder="Enter Deck Key" onChange={e => setDeckKey(e.target.value)} />
          {deckKey.length === 0 && (
            <Text type="danger">
              The Deck Key is empty. Everyone will be able to see and edit these decks!
            </Text>
          )}
        </Row>
        <Row>
          <Tabs>
            <TabPane tab="Deck List" key="list-decks-tab">
              <DeckList decks={decks} />
            </TabPane>
            <TabPane tab="Create New Deck" key="create-deck-tab">
              <CreateDeckPanel hash={uuidV5(deckKey, ROOT_NAMESPACE)} />
            </TabPane>
          </Tabs>
        </Row>
      </Card>
    </div>
  );
};

export default DeckChooser;
