import React, { useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Col, Drawer, Input, Modal, Result, Row, Select, Tabs } from 'antd';
import { BarChartOutlined, ExclamationCircleFilled, FilterOutlined } from '@ant-design/icons';
import sortBy from 'lodash/sortBy';

import CardInterface from './interfaces/CardInterface';
import CollectionActions from './components/CollectionActions/CollectionActions';
import { CardState } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import { getNextVariantId, getVariantGroups, withLatestVariantIds } from './utils/cardVariants';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import confirmationStyles from './confirmationModal.module.scss';
import './card-modal.scss';
import './ant-tabs.scss';

import CollectionFilterControls, {
  CheckBoxGroupInterface,
  CollectionFilterInterface,
} from './components/CollectionFilterControls/CollectionFilterControls';
import CollectionStats from './components/CollectionStats/CollectionStats';
import { createCard, EMPTY_CARD } from './actions/cardActions';
import { loadCollection } from './actions/collectionActions';

import { hasAccessToken, updateAccessToken } from './utils/accessService';
import MechanicModal from './components/MechanicModal/MechanicModal';
import ChangeLogModal from './components/ChangeLogModal/ChangeLogModal';
import BigCardRenderModal from './components/BigCardRenderModal/BigCardRenderModal';
import {
  CollectionPdfProgress,
  useCollectionPdfExport,
} from './components/CollectionPdfExport/CollectionPdfExport';
import { getAnnotations } from './actions/annotationActions';
import {
  addSeenCard,
  getUser,
  hasStoredUser,
  setCurrentUser,
  shouldShowUserSelect,
} from './actions/userActions';
import { MOBILE_COLLECTION_TABS_INSET, UNKNOWN_CREATOR } from './utils/constants';
import useActiveCardTab from './utils/useActiveCardTab';
import useTabsOverCards from './utils/useTabsOverCards';
import usePhoneLayout from './utils/usePhoneLayout';
import { matchesSelectedTags } from './utils/cardTagFilter';
import { matchesColorFilter } from './utils/colorFilter';
import { CardType, ColorType, RarityType, SORT_BY_LABELS, SortByType } from './interfaces/enums';
import { buildSortAccessors } from './utils/sortAccessors';
import useLocalStorage from './utils/useLocalStorageHook';

const { Search } = Input;
const { confirm } = Modal;

const NO_CARD = '-1';

const CARD_TABS: { name: string; filter: (card: CardInterface) => boolean }[] = [
  { name: 'All', filter: () => true },
  {
    name: 'Card drafts / idea dump',
    filter: card => card.meta.state === CardState.Draft,
  },
  {
    name: 'Cards to rate',
    filter: card => card.meta.state === CardState.Rate,
  },
  {
    name: 'Approved cards',
    filter: card => card.meta.state === CardState.Approved,
  },
];

const tabKey = (name: string) => `tab-key-${name}`;

// Guard so the initial data fetch runs once per app load, not again under
// StrictMode's dev double-mount or on remount.
let didInit = false;

const MobileApp: React.FC = () => {
  const pdfExport = useCollectionPdfExport();
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const pendingDraftRef = useRef<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [mechanicsVisible, setMechanicsVisible] = useState(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const isPhoneLayout = usePhoneLayout();
  const [sortByType, setSortByType] = useLocalStorage(
    'mtg-funset:SortBy',
    SortByType.LastUpdated,
  ) as [SortByType, (value: SortByType) => void];
  const [secondarySortBy, setSecondarySortBy] = useLocalStorage(
    'mtg-funset:SecondarySortBy',
    SortByType.Name,
  ) as [SortByType, (value: SortByType) => void];
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterInterface>({
    colors: Object.fromEntries(Object.values(ColorType).map(color => [color, true])),
    rarity: Object.fromEntries(Object.values(RarityType).map(rarity => [rarity, true])),
    types: Object.fromEntries(Object.values(CardType).map(type => [type, true])),
    creators: {},
    tags: {},
  });
  const [activeTabKey, setActiveTabKey] = useActiveCardTab();
  const { hostRef: tabsHostRef, reportScrolled } = useTabsOverCards(activeTabKey);

  const { cards, newUuid, dispatch, annotationAccessor, user, currentUser, tags } =
    useContext<StoreType>(Store);

  const sortList = useMemo(
    () => buildSortAccessors(sortByType, secondarySortBy, annotationAccessor),
    [sortByType, secondarySortBy, annotationAccessor],
  );

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

  // Defer the rapidly changing name filter so typing stays responsive while the
  // (potentially large) collection is re-sorted and re-filtered.
  const deferredNameFilter = useDeferredValue(cardNameFilter);

  const filteredCollection = useMemo(() => {
    return sortBy(mergedCollection, sortList).filter(
      o =>
        o.name.toLowerCase().includes(deferredNameFilter.toLowerCase()) &&
        matchesColorFilter(o, collectionFilter.colors) &&
        collectionFilter.rarity[o.rarity] &&
        o.front.cardTypes.some(type => collectionFilter.types[type]) &&
        collectionFilter.creators[o.creator.uuid] !== false &&
        matchesSelectedTags(
          o.tags || [],
          Object.keys(collectionFilter.tags).filter(tag => collectionFilter.tags[tag]),
        ),
    );
  }, [mergedCollection, sortList, deferredNameFilter, collectionFilter]);

  const activeTab = useMemo(
    () => CARD_TABS.find(tab => tabKey(tab.name) === activeTabKey) || CARD_TABS[0],
    [activeTabKey],
  );
  const visibleCollection = useMemo(
    () => filteredCollection.filter(activeTab.filter),
    [filteredCollection, activeTab],
  );

  // Surfaced on the phone's Filters button so the collection state stays
  // understandable while the filter sheet is slid down. Enum/creator filters
  // count as active when deselected; tag filters when selected.
  const activeFilterCount = useMemo(() => {
    if (!isPhoneLayout) return 0;
    const deselected = (group: CheckBoxGroupInterface) =>
      Object.values(group).filter(shown => !shown).length;
    return (
      (cardNameFilter !== '' ? 1 : 0) +
      deselected(collectionFilter.colors) +
      deselected(collectionFilter.rarity) +
      deselected(collectionFilter.types) +
      deselected(collectionFilter.creators) +
      Object.values(collectionFilter.tags).filter(Boolean).length
    );
  }, [isPhoneLayout, cardNameFilter, collectionFilter]);

  // O(1) uuid -> card lookups instead of a linear scan on every call.
  const cardByUuid = useMemo(
    () => new Map(mergedCollection.map(card => [card.uuid, card])),
    [mergedCollection],
  );

  const getCard = (collection: CardInterface[], uuid: string) =>
    cardByUuid.get(uuid) || EMPTY_CARD();

  const getCardUndefined = (collection: CardInterface[], uuid: string) => cardByUuid.get(uuid);

  const viewCard = (id: string, edit = false) => {
    setCardViewId(id);
    setShowCardEditor(edit);
    setShowCardModal(true);
  };

  const openCardInEditor = (id: string, oldCardName: string, edit = false) => {
    if (id === cardEditId) {
      viewCard(id, edit);
      return;
    }

    const pendingDraft = pendingDraftRef.current || tmpCard;
    if (pendingDraft) {
      confirm({
        title: `${pendingDraft.name || oldCardName} has changes that aren't saved yet`,
        icon: <ExclamationCircleFilled />,
        className: confirmationStyles.confirmationModal,
        okText: 'Yes, discard changes',
        okType: 'primary',
        cancelText: 'Keep editing',
        onOk() {
          pendingDraftRef.current = null;
          setTmpCard(null);
          setCardEditId(id);
          viewCard(id, edit);
        },
        onCancel() {
          viewCard(cardEditId, showCardEditor);
        },
      });
    } else {
      setCardEditId(id);
      viewCard(id, edit);
    }
  };

  useEffect(() => {
    if (newUuid) {
      addSeenCard(dispatch, newUuid, currentUser);
      if (cardEditId === NO_CARD) openCardInEditor(newUuid, '', true);
      else openCardInEditor(newUuid, getCard(filteredCollection, cardEditId).name, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newUuid]);

  const refresh = () => {
    loadCollection(dispatch);
    getAnnotations(dispatch);
    getUser(dispatch);
  };

  useEffect(() => {
    if (didInit) return;
    didInit = true;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCardVariant = (id: string) => {
    const select = () => {
      setCardEditId(id);
      setCardViewId(id);
      setShowCardEditor(false);
    };
    const pendingDraft = pendingDraftRef.current || tmpCard;
    if (pendingDraft && id !== cardEditId) {
      confirm({
        title: `${pendingDraft.name} has changes that aren't saved yet`,
        icon: <ExclamationCircleFilled />,
        className: confirmationStyles.confirmationModal,
        okText: 'Yes, discard changes',
        okType: 'primary',
        cancelText: 'Keep editing',
        onOk() {
          pendingDraftRef.current = null;
          setTmpCard(null);
          select();
        },
      });
    } else select();
  };

  const handleCardDeleted = (uuid: string) => {
    const nextVariantId = getNextVariantId(uuid, mergedCollection);
    if (!nextVariantId) return;
    pendingDraftRef.current = null;
    setTmpCard(null);
    setCardEditId(nextVariantId);
    setCardViewId(nextVariantId);
    setShowCardModal(true);
  };

  const createGrid = (collection: CardInterface[]) => {
    const collectionSpan = 24;

    return (
      <Row className={styles.fullHeight}>
        <Col ref={tabsHostRef} span={collectionSpan} className={styles.collection}>
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            className={styles.tabs}
            items={CARD_TABS.map(tabObj => ({
              key: tabKey(tabObj.name),
              label: (
                <span>
                  {tabObj.name}
                  <span className={styles.tabCount}>
                    {
                      getVariantGroups(filteredCollection.filter(tabObj.filter), mergedCollection)
                        .length
                    }
                  </span>
                </span>
              ),
              children: (
                <div className={styles.fullHeight}>
                  <CardCollection
                    cards={filteredCollection.filter(tabObj.filter)}
                    allCards={mergedCollection}
                    topPadding={MOBILE_COLLECTION_TABS_INSET}
                    onScrolledChange={scrolled => reportScrolled(tabKey(tabObj.name), scrolled)}
                    currentEditId={cardEditId}
                    onSelectVariant={switchCardVariant}
                    editCard={id => {
                      if (cardEditId === NO_CARD) openCardInEditor(id, '');
                      else openCardInEditor(id, getCard(collection, cardEditId).name);
                    }}
                    seenCardUuids={seenCardObject}
                    addSeenCard={uuid => addSeenCard(dispatch, uuid, currentUser)}
                    mobile
                  />
                </div>
              ),
            }))}
          />
        </Col>
      </Row>
    );
  };

  // Shared between the phone slide-up sheet and the tablet side column so
  // both layouts drive the exact same filtering.
  const filterControls = (
    <CollectionFilterControls
      collection={cards}
      setCollectionFilter={setCollectionFilter}
      availableTags={tags}
      setNameFilter={setCardNameFilter}
      sortControls={
        <div className={styles.sortRow}>
          <div className={styles.sortField}>
            <label htmlFor="mobile-primary-sort">Sort by</label>
            <Select
              id="mobile-primary-sort"
              className={styles.sortSelect}
              // @ts-ignore
              value={sortByType || SortByType.Color}
              // @ts-ignore
              onChange={(newSortByValue: SortByType) => setSortByType(newSortByValue)}
              aria-label="Primary sort"
              options={(Object.keys(SortByType) as (keyof typeof SortByType)[]).map(key => ({
                key: `mobile-sort-primary-${key}`,
                value: SortByType[key],
                label: SORT_BY_LABELS[SortByType[key]],
              }))}
            />
          </div>
          <div className={styles.sortField}>
            <label htmlFor="mobile-secondary-sort">Then by</label>
            <Select
              id="mobile-secondary-sort"
              className={styles.sortSelect}
              // @ts-ignore
              value={secondarySortBy || SortByType.Name}
              // @ts-ignore
              onChange={(newSortByValue: SortByType) => setSecondarySortBy(newSortByValue)}
              aria-label="Secondary sort"
              options={(Object.keys(SortByType) as (keyof typeof SortByType)[]).map(key => ({
                key: `mobile-sort-secondary-${key}`,
                value: SortByType[key],
                label: SORT_BY_LABELS[SortByType[key]],
              }))}
            />
          </div>
        </div>
      }
    />
  );

  if (!hasAccessToken()) {
    return (
      <div className={styles.authWrapper}>
        <Result
          status="403"
          title="401"
          subTitle="Sorry, you are not authorized to access this page. But please try to authenticate yourself."
          extra={
            <Search
              placeholder="Enter access key"
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
        <Card title="Choose current user" style={{ width: '300px' }}>
          <Select
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
        wrap={false}
        className={`${styles.app} ${
          currentUser.uuid === UNKNOWN_CREATOR.uuid ? styles.unauthenticated : styles.authenticated
        }`}
      >
        <Col span={24} className={styles.collectionWrapper}>
          {createGrid(filteredCollection)}
        </Col>
        <div className={styles.mobileControls}>
          {isPhoneLayout && (
            <Button
              className={styles.filtersButton}
              icon={<FilterOutlined />}
              aria-expanded={showFilters}
              onClick={() => setShowFilters(true)}
            >
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </Button>
          )}
          {isPhoneLayout && (
            <Button
              className={styles.filtersButton}
              icon={<BarChartOutlined />}
              aria-label="Stats"
              aria-expanded={showStats}
              onClick={() => setShowStats(true)}
            >
              Stats
            </Button>
          )}
          {isPhoneLayout ? (
            <Drawer
              aria-label="Filters"
              placement="bottom"
              size="80%"
              open={showFilters}
              onClose={() => setShowFilters(false)}
              closable={false}
              className={styles.filterSheet}
              styles={{
                body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
                footer: { padding: '12px 20px max(16px, env(safe-area-inset-bottom))' },
              }}
              footer={
                <Button
                  type="primary"
                  className={styles.doneButton}
                  onClick={() => setShowFilters(false)}
                >
                  Done
                </Button>
              }
            >
              {filterControls}
            </Drawer>
          ) : (
            filterControls
          )}
          <Drawer
            aria-label="Statistics"
            placement="bottom"
            size="80%"
            open={showStats}
            onClose={() => setShowStats(false)}
            closable={false}
            className={styles.filterSheet}
            styles={{
              body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
              footer: { padding: '12px 20px max(16px, env(safe-area-inset-bottom))' },
            }}
            footer={
              <Button
                type="primary"
                className={styles.doneButton}
                onClick={() => setShowStats(false)}
              >
                Done
              </Button>
            }
          >
            <CollectionStats
              collection={visibleCollection}
              allCards={mergedCollection}
              fillHeight
            />
          </Drawer>
          <CollectionActions
            mobile
            onShowStats={isPhoneLayout ? undefined : () => setShowStats(true)}
            statsExpanded={showStats}
            currentUser={currentUser}
            users={user}
            onCreate={() => createCard(dispatch, currentUser)}
            onEditMechanics={() => {
              setShowCardModal(false);
              setMechanicsVisible(true);
            }}
            onSwitchUser={nextUser => setCurrentUser(dispatch, nextUser)}
            onDownloadPdf={() => pdfExport.start(visibleCollection, filteredCollection)}
            onReload={refresh}
          />
        </div>
      </Row>
      <MechanicModal visible={mechanicsVisible} setVisible={setMechanicsVisible} />
      <CollectionPdfProgress progress={pdfExport.progress} onCancel={pdfExport.cancel} />
      <BigCardRenderModal
        onSelectVariant={switchCardVariant}
        mobile
        card={getCard(filteredCollection, cardViewId)}
        visible={showCardModal && cards.some(card => card.uuid === cardViewId)}
        hide={() => {
          setShowCardModal(false);
          setShowCardEditor(false);
        }}
        mobileEditor={
          <CardEditor
            card={getCardUndefined(filteredCollection, cardEditId)}
            saveTmpCard={setTmpCard}
            onCardDeleted={handleCardDeleted}
            onDraftChange={draft => {
              pendingDraftRef.current = draft;
            }}
          />
        }
        mobileEditorOpen={showCardEditor}
        onEditCard={() => setShowCardEditor(true)}
        onHideEditor={() => setShowCardEditor(false)}
        collectionNumber={
          filteredCollection.findIndex((o: CardInterface) => o.uuid === cardViewId) + 1
        }
        collectionSize={filteredCollection.length}
      />
    </div>
  );
};

export default MobileApp;
