import React, { useContext, useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Row, Col, Spin, Typography, Icon, Popover, Radio } from 'antd';

// @ts-ignore
import StackGrid, { transitions } from 'react-stack-grid';

import { Store, StoreType } from '../../store';
import { readDeck, updateDeck } from '../../actions/deckActions';
import CardSearch from '../CardSearch';
import SmallCardInterface from '../../SmallCardInterface';

import styles from './Editor.module.scss';
import DeckStats from '../DeckStats';
import { injectManaIcons } from '../../../custom-set/utils/injectUtils';

enum DeckSplit {
  TYPE = 'Card Type',
  CMC = 'Converted Mana Cost',
  RARITY = 'RARITY'
}

const { Text } = Typography;

const Editor: React.FC<RouteComponentProps> = ({ location }) => {
  const { currentDeck, dispatch } = useContext<StoreType>(Store);
  const [deckSplit, setDeckSplit] = useState<DeckSplit>(DeckSplit.TYPE);

  useEffect(() => {
    readDeck(dispatch, location.pathname.substring(location.pathname.lastIndexOf('/') + 1));
  }, []);

  const colorIdentity: string =
    currentDeck && currentDeck.commander.color_identity
      ? currentDeck.commander.color_identity.join('')
      : '';

  const addCard = (card: SmallCardInterface) => {
    if (!currentDeck) return;
    if (card.type_line && card.type_line.indexOf('Basic Land') === -1) {
      if (currentDeck.cards.find(c => c.name === card.name)) return;
    }

    updateDeck(dispatch, { ...currentDeck, cards: [...currentDeck.cards, card] });
  };

  const removeCard = (card: SmallCardInterface) => {
    if (!currentDeck) return;

    updateDeck(dispatch, {
      ...currentDeck,
      cards: currentDeck.cards.filter(c => c.id !== card.id)
    });
  };

  const cardCount: { [key: string]: number } = {};
  if (currentDeck) {
    currentDeck.cards.forEach(card => {
      if (cardCount[card.name]) cardCount[card.name] += 1;
      else cardCount[card.name] = 1;
    });
  }

  const splitDeckIntoBuckets = (): { [key: string]: SmallCardInterface[] } => {
    if (!currentDeck) return {};

    const buckets: { [key: string]: SmallCardInterface[] } = {};

    const getKey = (card: SmallCardInterface): string => {
      if (deckSplit === DeckSplit.CMC) return card.cmc.toString(10);
      if (deckSplit === DeckSplit.TYPE) {
        if (!card.type_line) return '';
        if (card.type_line.indexOf('—') !== -1)
          return card.type_line
            .substring(0, card.type_line.indexOf('—') - 1)
            .replace('Legendary ', '');
        return card.type_line.replace('Legendary ', '');
      }
      if (deckSplit === DeckSplit.RARITY) return card.rarity;
      return '';
    };

    currentDeck.cards
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(card => {
        const key = getKey(card);
        if (!buckets[key]) buckets[key] = [card];
        else buckets[key].push(card);
      });

    return buckets;
  };

  const renderDeckBuckets = () => {
    const buckets = splitDeckIntoBuckets();

    return Object.keys(buckets).map(bucketName => (
      <div key={bucketName} className={styles.bucket}>
        <Text className={styles.bucketTitle}>
          {`${deckSplit}: ${bucketName} [${buckets[bucketName].length}]`}
        </Text>
        {buckets[bucketName]
          .filter((card, i) => buckets[bucketName].findIndex(c => c.name === card.name) === i)
          .map(card => (
            <Text className={styles.bucketEntry}>
              <Icon type="close" className={styles.closeIcon} onClick={() => removeCard(card)} />
              <Popover content={<img src={card.cover} alt="" width={300} />} placement="top">
                {`${cardCount[card.name]} ${card.name}`}
                {card.power && card.toughness && <span>{`[${card.power}/${card.toughness}]`}</span>}
                {card.loyalty && <span>{`[${card.loyalty} Loyalty]`}</span>}
              </Popover>
              {injectManaIcons(card.mana_cost ? card.mana_cost.replace(/\//g, '') : '')}
            </Text>
          ))}
      </div>
    ));
  };

  return (
    <Spin spinning={!currentDeck}>
      <Row>
        <Col span={16} className={styles.deckEditor}>
          <Row>
            <Col span={4} style={{ height: '25vh', textAlign: 'center' }}>
              <img alt="" src={currentDeck && currentDeck.commander.cover} height="100%" />
            </Col>
            <Col span={20}>
              <DeckStats deck={currentDeck} />
            </Col>
          </Row>
          <Row>
            Filter Cards by
            <Radio.Group
              size="small"
              value={deckSplit}
              buttonStyle="solid"
              onChange={e => setDeckSplit(e.target.value)}
            >
              {Object.values(DeckSplit).map(key => (
                // @ts-ignore
                <Radio.Button value={key}>{key}</Radio.Button>
              ))}
            </Radio.Group>
          </Row>
          <Row>
            {`Currently ${
              currentDeck ? currentDeck.cards.length + 1 : 0
            } cards in our deck (Commander included)`}
          </Row>
          <Row className={styles.grid}>
            <StackGrid columnWidth={244}>{renderDeckBuckets()}</StackGrid>
          </Row>
          {/* <div className={styles.cardList}>{renderDeckBuckets()}</div> */}
        </Col>
        <Col span={8} className={styles.cardSearch}>
          <CardSearch
            filter={`id<=${colorIdentity}`}
            addCard={addCard}
            hiddenCards={currentDeck ? currentDeck.cards : []}
          />
        </Col>
      </Row>
    </Spin>
  );
};

export default withRouter(Editor);
