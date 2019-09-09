import React, { useContext, useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Input, Modal, Result, Row, Select, Tabs } from 'antd';
import _ from 'lodash';
import LogRocket from 'logrocket';

import CardInterface from './interfaces/CardInterface';
import { CardState } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';
import './ant-tabs.scss';
import './reset.css';

import CollectionFilterControls from './components/CollectionFilterControls/CollectionFilterControls';
import { EMPTY_CARD, refreshCollection } from './actions/cardActions';

import { hasAccessToken, updateAccessToken } from './utils/accessService';
import { getMechanics } from './actions/mechanicActions';
import ChangeLogModal from './components/ChangeLogModal/ChangeLogModal';
import BigCardRenderModal from './components/BigCardRenderModal/BigCardRenderModal';
import { getAnnotations } from './actions/annotationActions';
import { addSeenCard, getUser, setCurrentUser } from './actions/userActions';
import { UNKNOWN_CREATOR } from './utils/constants';

const { Search } = Input;
const { confirm } = Modal;
const { TabPane } = Tabs;

const NO_CARD = '-1';

const MobileApp: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');

  const { cards, newUuid, dispatch, annotationAccessor, user, currentUser } = useContext<StoreType>(
    Store
  );

  const seenCardObject: { [key: string]: boolean } = {};
  currentUser.seenCards.forEach((uuid: string) => {
    seenCardObject[uuid] = true;
  });

  const mergedCollection = [...cards.filter(card => card.uuid !== (tmpCard ? tmpCard.uuid : ''))];
  if (tmpCard) mergedCollection.push(tmpCard);

  const lastUpdated = (card: CardInterface): number => {
    if (!seenCardObject[card.uuid]) return Number.MAX_SAFE_INTEGER;

    const annotations = annotationAccessor[card.uuid];
    if (!annotations) return card.meta.lastUpdated;

    const lastAnnotation = annotations.reduce((a, b) => (a.datetime > b.datetime ? a : b));
    return Math.max(lastAnnotation.datetime, card.meta.lastUpdated);
  };

  const filteredCollection = _.sortBy(mergedCollection, [
    (o: CardInterface) => -1 * lastUpdated(o)
  ]).filter(o => o.name.toLowerCase().includes(cardNameFilter.toLowerCase()));

  const getCard = (collection: CardInterface[], uuid: string) =>
    filteredCollection.find(card => card.uuid === uuid) || EMPTY_CARD();

  const getCardUndefined = (collection: CardInterface[], uuid: string) =>
    filteredCollection.find(card => card.uuid === uuid);

  const viewCard = (id: string) => {
    LogRocket.log(`View card ${getCard(filteredCollection, id).name}`);
    setCardViewId(id);
    setShowCardModal(true);
  };

  const openCardInEditor = (id: string, oldCardName: string) => {
    if (id === cardEditId) {
      viewCard(id);
      return;
    }

    if (tmpCard) {
      confirm({
        title: `${oldCardName} has unsaved changes`,
        okText: 'Yes discard all changes',
        type: 'danger',
        okType: 'danger',
        cancelText: 'Edit old card',
        onOk() {
          setCardEditId(id);
          viewCard(id);
        },
        onCancel() {
          viewCard(cardEditId);
        }
      });
    } else {
      setCardEditId(id);
      viewCard(id);
    }
  };

  useEffect(() => {
    if (newUuid) {
      addSeenCard(dispatch, newUuid, currentUser);
      if (cardEditId === NO_CARD) openCardInEditor(newUuid, '');
      else openCardInEditor(newUuid, getCard(filteredCollection, cardEditId).name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newUuid]);

  const refresh = () => {
    refreshCollection(dispatch);
    getMechanics(dispatch);
    getAnnotations(dispatch);
    getUser(dispatch);
  };

  useEffect(refresh, []);

  const createGrid = (collection: CardInterface[]) => {
    const collectionSpan = 24;
    const editorSpan = 0;

    const cardTabs = [
      { name: 'All', filter: () => true },
      {
        name: 'Card Drafts / Idea Dump',
        filter: (o: CardInterface) => o.meta.state === CardState.Draft
      },
      {
        name: 'Cards to Rate',
        filter: (o: CardInterface) => o.meta.state === CardState.Rate
      },
      {
        name: 'Approved Cards',
        filter: (o: CardInterface) => o.meta.state === CardState.Approved
      }
    ];

    return (
      <Row className={styles.fullHeight}>
        <ChangeLogModal />
        <Col span={collectionSpan} className={styles.collection}>
          <Tabs defaultActiveKey="tab-key-Card Drafts / Idea Dump" className={styles.collection}>
            {cardTabs.map(tabObj => (
              <TabPane
                tab={
                  <Badge
                    className={styles.tabBadge}
                    count={_.filter(filteredCollection, tabObj.filter).length}
                    showZero
                    overflowCount={999}
                  >
                    {tabObj.name}
                  </Badge>
                }
                key={`tab-key-${tabObj.name}`}
                className={styles.fullHeight}
              >
                <CardCollection
                  cards={_.filter(filteredCollection, tabObj.filter)}
                  currentEditId={cardEditId}
                  editCard={id => {
                    if (cardEditId === NO_CARD) openCardInEditor(id, '');
                    else openCardInEditor(id, getCard(collection, cardEditId).name);
                  }}
                  seenCardUuids={seenCardObject}
                  addSeenCard={uuid => addSeenCard(dispatch, uuid, currentUser)}
                  mobile
                />
              </TabPane>
            ))}
          </Tabs>
        </Col>
        <Col span={editorSpan} className={styles.editor}>
          <CardEditor card={getCardUndefined(collection, cardEditId)} saveTmpCard={setTmpCard} />
        </Col>
      </Row>
    );
  };

  if (!hasAccessToken()) {
    return (
      <div className={styles.authWrapper}>
        <Result
          status="403"
          title="401"
          subTitle="Sorry, you are not authorized to access this page. But please try to authenticate yourself."
          extra={
            <Search
              placeholder="Input Access Key"
              enterButton="Enter"
              onSearch={value => {
                updateAccessToken(value);
                window.location.reload();
              }}
            />
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={`${styles.loginWrapper} ${
          currentUser.uuid !== UNKNOWN_CREATOR.uuid ? styles.authenticated : ''
        }`}
      >
        <Card title="Choose Current User" style={{ width: '300px' }}>
          <Select
            size="large"
            onChange={(key: string) =>
              setCurrentUser(dispatch, _.find(user, o => o.uuid === key) || UNKNOWN_CREATOR)
            }
            style={{ width: '100%' }}
          >
            {user
              .filter(u => u.name !== 'ADMIN')
              .map(d => (
                <Select.Option key={`login-user-${d.uuid}`} value={d.uuid}>
                  {d.name}
                </Select.Option>
              ))}
          </Select>
        </Card>
      </div>
      <Row
        className={`${styles.app} ${
          currentUser.uuid === UNKNOWN_CREATOR.uuid ? styles.unauthenticated : styles.authenticated
        }`}
      >
        <Col span={24} className={styles.collectionWrapper}>
          {createGrid(filteredCollection)}
        </Col>
        <div className={styles.mobileControls}>
          <CollectionFilterControls collection={cards} setNameFilter={setCardNameFilter} />
          <Button icon="reload" type="primary" onClick={refresh} className={styles.fullWidth}>
            Reload Collection
          </Button>
        </div>
      </Row>
      <BigCardRenderModal
        mobile
        card={getCard(filteredCollection, cardViewId)}
        visible={showCardModal}
        hide={() => setShowCardModal(false)}
        collectionNumber={
          _.findIndex(filteredCollection, (o: CardInterface) => o.uuid === cardViewId) + 1
        }
        collectionSize={filteredCollection.length}
      />
    </div>
  );
};

export default MobileApp;
