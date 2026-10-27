import React, { useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Col, Input, Modal, Row, Select, Tabs, Badge, Card, Result } from 'antd';
import sortCardsBy from 'lodash/sortBy';
import CollectionActions from './components/CollectionActions/CollectionActions';

import fileDownload from 'js-file-download';

import CardInterface from './interfaces/CardInterface';
import { CardState, SortByType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import { getVariantGroups, withLatestVariantIds } from './utils/cardVariants';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';
import './ant-tabs.scss';

import CollectionFilterControls, {
  CollectionFilterInterface,
} from './components/CollectionFilterControls/CollectionFilterControls';
import cardToColor from './utils/cardToColor';
import { buildSortAccessors } from './utils/sortAccessors';
import { createCard, EMPTY_CARD, refreshCollection } from './actions/cardActions';

import { hasAccessToken, updateAccessToken } from './utils/accessService';
import { getMechanics } from './actions/mechanicActions';
import { getTags } from './actions/tagActions';
import MechanicModal from './components/MechanicModal/MechanicModal';
import useLocalStorage from './utils/useLocalStorageHook';
import ChangeLogModal from './components/ChangeLogModal/ChangeLogModal';
import BigCardRenderModal from './components/BigCardRenderModal/BigCardRenderModal';
import { getAnnotations } from './actions/annotationActions';
import {
  addSeenCard,
  getUser,
  hasStoredUser,
  setCurrentUser,
  shouldShowUserSelect,
} from './actions/userActions';
import { UNKNOWN_CREATOR } from './utils/constants';
import { matchesSelectedTags } from './utils/cardTagFilter';
import useActiveCardTab from './utils/useActiveCardTab';

const { Search } = Input;
const { confirm } = Modal;

const NO_CARD = '-1';

// Shared tab definitions so the collection grid and the sidebar filter counts
// agree on which cards belong to each tab.
const CARD_TABS: { name: string; filter: (o: CardInterface) => boolean }[] = [
  { name: 'All', filter: () => true },
  {
    name: 'Card Drafts / Idea Dump',
    filter: (o: CardInterface) => o.meta.state === CardState.Draft,
  },
  {
    name: 'Cards to Rate',
    filter: (o: CardInterface) => o.meta.state === CardState.Rate,
  },
  {
    name: 'Approved Cards',
    filter: (o: CardInterface) => o.meta.state === CardState.Approved,
  },
];

const tabKey = (name: string) => `tab-key-${name}`;

export const openMechanicEditor = (
  closeCardModal: (visible: boolean) => void,
  openMechanicModal: (visible: boolean) => void,
) => {
  closeCardModal(false);
  openMechanicModal(true);
};

// Guard so the initial data fetch runs once per app load, not again under
// StrictMode's dev double-mount or on remount.
let didInit = false;

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const pendingDraftRef = useRef<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');
  const [mechanicsVisible, setMechanicsVisible] = useState(false);
  const [sortBy, setSortBy] = useLocalStorage('mtg-funset:SortBy', SortByType.LastUpdated) as [
    SortByType,
    (value: SortByType) => void,
  ];
  const [secondarySortBy, setSecondarySortBy] = useLocalStorage(
    'mtg-funset:SecondarySortBy',
    SortByType.Name,
  ) as [SortByType, (value: SortByType) => void];

  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterInterface>({
    colors: {},
    rarity: {},
    types: {},
    creators: {},
    tags: {},
  });

  const [colSpanSetting, setColSpanSetting] = useState<number>(-1);

  const [activeTabKey, setActiveTabKey] = useActiveCardTab();

  const { cards, newUuid, dispatch, annotationAccessor, user, currentUser, tags } =
    useContext<StoreType>(Store);

  // Captured once at mount: avoids flashing the user chooser while the stored
  // user is restored by the async `/user` fetch.
  const [hadStoredUserOnMount] = useState(hasStoredUser);
  const showUserSelect = shouldShowUserSelect(currentUser, user, hadStoredUserOnMount);

  const seenCardObject = useMemo(() => {
    const seen: { [key: string]: boolean } = {};
    currentUser.seenCards.forEach((uuid: string) => {
      seen[uuid] = true;
    });
    return seen;
  }, [currentUser.seenCards]);

  const mergedCollection = useMemo(() => {
    const merged = cards.filter(card => card.uuid !== (tmpCard ? tmpCard.uuid : ''));
    if (tmpCard) merged.push(withLatestVariantIds(tmpCard, cards));
    return merged;
  }, [cards, tmpCard]);

  // Cards belonging to the currently selected tab. Drives the sidebar filter
  // counts so they reflect the active tab rather than the whole collection.
  const activeTab = useMemo(
    () => CARD_TABS.find(tab => tabKey(tab.name) === activeTabKey) || CARD_TABS[0],
    [activeTabKey],
  );
  const tabCollection = useMemo(() => cards.filter(activeTab.filter), [cards, activeTab]);

  const sortList = useMemo(
    () => buildSortAccessors(sortBy, secondarySortBy, annotationAccessor),
    [sortBy, secondarySortBy, annotationAccessor],
  );

  // Defer the rapidly changing name filter so typing stays responsive while the
  // (potentially large) collection is re-sorted and re-filtered.
  const deferredNameFilter = useDeferredValue(cardNameFilter);

  const filteredCollection = useMemo(
    () =>
      sortCardsBy(mergedCollection, sortList).filter(
        o =>
          o.name.toLowerCase().includes(deferredNameFilter.toLowerCase()) &&
          collectionFilter.colors[cardToColor(o.front, o.manaCost).color] &&
          collectionFilter.rarity[o.rarity] &&
          o.front.cardTypes.some(t => collectionFilter.types[t]) &&
          collectionFilter.creators[o.creator.uuid] !== false &&
          matchesSelectedTags(
            o.tags || [],
            Object.keys(collectionFilter.tags).filter(tag => collectionFilter.tags[tag]),
          ),
      ),
    [mergedCollection, sortList, deferredNameFilter, collectionFilter],
  );

  // O(1) uuid -> card lookups instead of a linear scan on every call.
  const cardByUuid = useMemo(
    () => new Map(mergedCollection.map(card => [card.uuid, card])),
    [mergedCollection],
  );

  const getCard = (collection: CardInterface[], uuid: string) =>
    cardByUuid.get(uuid) || EMPTY_CARD();

  const getCardUndefined = (collection: CardInterface[], uuid: string) => cardByUuid.get(uuid);

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
    getTags(dispatch);
    getAnnotations(dispatch);
    getUser(dispatch);
  };

  useEffect(() => {
    if (didInit) return;
    didInit = true;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setCardViewId(id);
    setShowCardModal(true);
  };

  const openCardInEditor = (id: string, oldCardName: string) => {
    if (id === cardEditId) {
      viewCard(id);
      return;
    }

    const pendingDraft = pendingDraftRef.current || tmpCard;
    if (pendingDraft) {
      confirm({
        title: `${pendingDraft.name || oldCardName} has unsaved changes`,
        okText: 'Yes discard all changes',
        okType: 'danger',
        cancelText: 'Edit old card',
        onOk() {
          pendingDraftRef.current = null;
          setTmpCard(null);
          setCardEditId(id);
          viewCard(id);
        },
        onCancel() {
          viewCard(cardEditId);
        },
      });
    } else {
      setCardEditId(id);
      viewCard(id);
    }
  };

  const switchCardVariant = (id: string) => {
    const select = () => {
      setCardEditId(id);
      setCardViewId(id);
    };
    const pendingDraft = pendingDraftRef.current || tmpCard;
    if (pendingDraft && id !== cardEditId) {
      confirm({
        title: `${pendingDraft.name} has unsaved changes`,
        okText: 'Yes discard all changes',
        okType: 'danger',
        cancelText: 'Edit old card',
        onOk() {
          pendingDraftRef.current = null;
          setTmpCard(null);
          select();
        },
      });
    } else select();
  };

  const createGrid = (collection: CardInterface[]) => {
    const collectionSpan = 18;
    const editorSpan = 6;

    return (
      <Row className={styles.fullHeight}>
        <MechanicModal visible={mechanicsVisible} setVisible={setMechanicsVisible} />
        <Col span={collectionSpan} className={styles.collection}>
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            className={styles.tabs}
            items={CARD_TABS.map(tabObj => ({
              key: tabKey(tabObj.name),
              label: (
                <Badge
                  className={styles.tabBadge}
                  count={
                    getVariantGroups(filteredCollection.filter(tabObj.filter), mergedCollection)
                      .length
                  }
                  showZero
                  overflowCount={999}
                >
                  {tabObj.name}
                </Badge>
              ),
              children: (
                <div className={styles.fullHeight}>
                  <CardCollection
                    cards={filteredCollection.filter(tabObj.filter)}
                    allCards={mergedCollection}
                    currentEditId={cardEditId}
                    onSelectVariant={switchCardVariant}
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
                </div>
              ),
            }))}
          />
        </Col>
        <Col span={editorSpan} className={styles.editor}>
          <CardEditor
            card={getCardUndefined(collection, cardEditId)}
            saveTmpCard={setTmpCard}
            onDraftChange={draft => {
              pendingDraftRef.current = draft;
            }}
          />
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
      <ChangeLogModal />
      <div className={`${styles.loginWrapper} ${showUserSelect ? '' : styles.authenticated}`}>
        <Card title="Choose Current User" style={{ width: '300px' }}>
          <Select
            size="large"
            onChange={(key: string) =>
              setCurrentUser(dispatch, user.find(o => o.uuid === key) || UNKNOWN_CREATOR)
            }
            style={{ width: '100%' }}
            options={user
              .filter(u => u.name !== 'ADMIN')
              .map(d => ({ key: `login-user-${d.uuid}`, value: d.uuid, label: d.name }))}
          />
        </Card>
      </div>
      <Row
        className={`${styles.app} ${
          currentUser.uuid === UNKNOWN_CREATOR.uuid ? styles.unauthenticated : styles.authenticated
        }`}
      >
        <Col span={3} className={styles.sidebarCol}>
          <aside className={styles.sidebar} aria-label="Collection sidebar">
            <CollectionFilterControls
              collection={tabCollection}
              setCollectionColSpan={setColSpanSetting}
              setCollectionFilter={setCollectionFilter}
              availableTags={tags}
              setNameFilter={setCardNameFilter}
              sortControls={
                <div className={styles.sortRow}>
                  <div className={styles.sortField}>
                    <label htmlFor="collection-primary-sort">Sort by</label>
                    <Select
                      id="collection-primary-sort"
                      className={styles.sortSelect}
                      // @ts-ignore
                      value={sortBy || SortByType.Color}
                      // @ts-ignore
                      onChange={(newSortByValue: SortByType) => setSortBy(newSortByValue)}
                      aria-label="Primary sort"
                      options={(Object.keys(SortByType) as (keyof typeof SortByType)[]).map(d => ({
                        key: `collection-sort-primary-${d}`,
                        value: SortByType[d],
                        label: SortByType[d],
                      }))}
                    />
                  </div>
                  <div className={styles.sortField}>
                    <label htmlFor="collection-secondary-sort">Then by</label>
                    <Select
                      id="collection-secondary-sort"
                      className={styles.sortSelect}
                      // @ts-ignore
                      value={secondarySortBy || SortByType.Name}
                      // @ts-ignore
                      onChange={(newSortByValue: SortByType) => setSecondarySortBy(newSortByValue)}
                      aria-label="Secondary sort"
                      options={(Object.keys(SortByType) as (keyof typeof SortByType)[]).map(d => ({
                        key: `collection-sort-secondary-${d}`,
                        value: SortByType[d],
                        label: SortByType[d],
                      }))}
                    />
                  </div>
                </div>
              }
            />
            <CollectionActions
              currentUser={currentUser}
              users={user}
              onCreate={() => createCard(dispatch, currentUser)}
              onEditMechanics={() => openMechanicEditor(setShowCardModal, setMechanicsVisible)}
              onSwitchUser={nextUser => setCurrentUser(dispatch, nextUser)}
              onDownload={() => downloadCollectionAsJson(filteredCollection)}
              onReload={refresh}
            />
          </aside>
        </Col>
        <Col span={21} className={styles.contentCol}>
          {createGrid(filteredCollection)}
        </Col>
      </Row>
      <BigCardRenderModal
        onSelectVariant={switchCardVariant}
        card={getCard(filteredCollection, cardViewId)}
        visible={showCardModal && cards.some(card => card.uuid === cardViewId)}
        hide={() => setShowCardModal(false)}
        collectionNumber={
          filteredCollection.findIndex((o: CardInterface) => o.uuid === cardViewId) + 1
        }
        collectionSize={filteredCollection.length}
      />
    </div>
  );
};

export default App;
