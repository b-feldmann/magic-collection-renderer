import React from 'react';
import './App.css';
import CardInterface from './interfaces/CardInterface';
import { CardMainType, RarityType, SortType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import OfflineCardProvider from './components/OfflineCardProvider/OfflineCardProvider';
import { Col, Row } from 'antd';
import CardEditor from './components/CardEditor/CardEditor';

const App: React.FC = () => {
  return (
    // @ts-ignore
    <OfflineCardProvider
      render={(
        cards: CardInterface[],
        saveCard: (key: number, card: CardInterface) => void
      ) => (
        <Row>
          <Col span={16}>
            <CardCollection cards={cards} sortBy={SortType.Name} />
          </Col>
          <Col span={8}>
            <CardEditor card={cards[0]} saveCard={saveCard} />
          </Col>
        </Row>
      )}
    />
  );
};

export default App;
