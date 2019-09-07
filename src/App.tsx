import React, { useContext, useEffect, useState } from 'react';
import { Button, Col, Input, Modal, Row, Select, Tabs, Badge, Card, Result } from 'antd';
import _ from 'lodash';

import fileDownload from 'js-file-download';

import LogRocket from 'logrocket';
import CardInterface from './interfaces/CardInterface';
import { CardState, ColorTypePlus, SortByType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';
import './ant-tabs.scss';
import './reset.css';

import CollectionFilterControls, {
  CollectionFilterInterface
} from './components/CollectionFilterControls/CollectionFilterControls';
import cardToColor from './utils/cardToColor';
import { createCard, EMPTY_CARD, refreshCollection } from './actions/cardActions';

import { hasAccessToken, updateAccessToken } from './utils/accessService';
import { getMechanics } from './actions/mechanicActions';
import MechanicModal from './components/MechanicModal/MechanicModal';
import useLocalStorage from './utils/useLocalStorageHook';
import ChangeLogModal from './components/ChangeLogModal/ChangeLogModal';
import BigCardRenderModal from './components/BigCardRenderModal/BigCardRenderModal';
import { getAnnotations } from './actions/annotationActions';
import { addSeenCard, getUser, setCurrentUser } from './actions/userActions';
import { UNKNOWN_CREATOR } from './interfaces/constants';

const { Search } = Input;
const { confirm } = Modal;
const { TabPane } = Tabs;

const NO_CARD = '-1';

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');
  const [mechanicsVisible, setMechanicsVisible] = useState(false);
  const [sortBy, setSortBy] = useLocalStorage('mtg-funset:SortBy', SortByType.LastUpdated);

  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterInterface>({
    colors: {},
    rarity: {},
    types: {}
  });

  const [colSpanSetting, setColSpanSetting] = useState<number>(-1);

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

    const lastAnnotatoin = annotations.reduce((a, b) => (a.datetime > b.datetime ? a : b));
    return Math.max(lastAnnotatoin.datetime, card.meta.lastUpdated);
  };

  const sortList = [];
  if (sortBy === SortByType.Color) {
    sortList.push((o: CardInterface) =>
      _.indexOf(Object.values(ColorTypePlus), cardToColor(o.front.cardMainType, o.manaCost).color)
    );
    sortList.push((o: CardInterface) => o.front.name.toLowerCase());
  }
  if (sortBy === SortByType.Creator) {
    sortList.push((o: CardInterface) =>
      o.creator.uuid === UNKNOWN_CREATOR.uuid ? 'zzzzz' : o.creator.name
    );
    sortList.push((o: CardInterface) =>
      _.indexOf(Object.values(ColorTypePlus), cardToColor(o.front.cardMainType, o.manaCost).color)
    );
    sortList.push((o: CardInterface) => o.front.name.toLowerCase());
  }
  if (sortBy === SortByType.LastUpdated) {
    sortList.push((o: CardInterface) => -1 * lastUpdated(o));
  }

  const filteredCollection = _.sortBy(mergedCollection, sortList).filter(
    o =>
      o.name.toLowerCase().includes(cardNameFilter.toLowerCase()) &&
      collectionFilter.colors[cardToColor(o.front.cardMainType, o.manaCost).color] &&
      collectionFilter.rarity[o.rarity] &&
      collectionFilter.types[o.front.cardMainType]
  );

  const getCard = (collection: CardInterface[], uuid: string) =>
    filteredCollection.find(card => card.uuid === uuid) || EMPTY_CARD();

  const getCardUndefined = (collection: CardInterface[], uuid: string) =>
    filteredCollection.find(card => card.uuid === uuid);

  useEffect(() => {
    if (newUuid) {
      addSeenCard(dispatch, newUuid, currentUser);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (cardEditId === NO_CARD) openCardInEditor(newUuid, '');
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
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

  const downloadJson = (card: CardInterface) => {
    const data = { ...card };

    fileDownload(JSON.stringify(data), `${card.name}.json`);
  };

  const downloadCollectionAsJson = (cardCollection: CardInterface[]) => {
    const collectionData: object[] = [];

    cardCollection.forEach(card => {
      collectionData.push(card);
    });

    fileDownload(JSON.stringify(collectionData), `magic-collection.json`);
  };

  const downloadImage = (id: string, name: string) => {
    console.log(`image download: ${id} - ${name}`);
  };

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

  const createGrid = (collection: CardInterface[]) => {
    const collectionSpan = 18;
    const editorSpan = 6;

    const cardTabs = [
      { name: 'All', filter: (o: CardInterface) => true },
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
        <MechanicModal visible={mechanicsVisible} setVisible={setMechanicsVisible} />
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
                  downloadImage={id => downloadImage(id, getCard(collection, id).name)}
                  downloadJson={id => downloadJson(getCard(collection, id))}
                  colSpanSetting={colSpanSetting}
                  seenCardUuids={seenCardObject}
                  addSeenCard={uuid => addSeenCard(dispatch, uuid, currentUser)}
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
              className={styles.accessKeyInput}
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
        <Col span={3}>
          <div className={styles.sortControls}>
            <h3>Sort Collection By</h3>
            <Select
              className={styles.sortSelect}
              size="small"
              // @ts-ignore
              value={sortBy || SortByType.Color}
              // @ts-ignore
              onChange={(newSortByValue: SortByType) => setSortBy(newSortByValue)}
            >
              {Object.keys(SortByType).map((d: any) => (
                <Select.Option key={`collection-filter-key-${d}`} value={SortByType[d]}>
                  {SortByType[d]}
                </Select.Option>
              ))}
            </Select>
          </div>
          <CollectionFilterControls
            collection={cards}
            setCollectionColSpan={setColSpanSetting}
            setCollectionFilter={setCollectionFilter}
            setNameFilter={setCardNameFilter}
          />
        </Col>
        <Col span={21}>{createGrid(filteredCollection)}</Col>
        <div className={styles.desktopControls}>
          <Button
            icon="edit"
            onClick={() => setMechanicsVisible(true)}
            style={{ width: '100%', marginTop: '8px' }}
            type="primary"
          >
            Edit Mechanics
          </Button>
          <Button
            icon="plus"
            type="primary"
            onClick={() => createCard(dispatch, currentUser)}
            className={styles.fullWidth}
          >
            Add Card
          </Button>
          <Button
            icon="download"
            type="primary"
            onClick={() => downloadCollectionAsJson(filteredCollection)}
            className={styles.fullWidth}
          >
            JSON
          </Button>
          <Button icon="reload" type="primary" onClick={refresh} className={styles.fullWidth}>
            Reload Collection
          </Button>
        </div>
      </Row>
      <BigCardRenderModal
        card={getCard(filteredCollection, cardViewId)}
        visible={showCardModal}
        hide={() => setShowCardModal(false)}
        collectionNumber={_.findIndex(
          filteredCollection,
          (o: CardInterface) => o.uuid === cardViewId
        )}
        collectionSize={filteredCollection.length}
      />
    </div>
  );
};

export default App;
