import React, { useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Col, Input, Modal, Result, Row, Select, Tabs } from 'antd';
import sortBy from 'lodash/sortBy';

import CardInterface from './interfaces/CardInterface';
import AntIcon from './components/AntIcon/AntIcon';
import { CardState } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import { getVariantGroups, withLatestVariantIds } from './utils/cardVariants';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';
import './ant-tabs.scss';

import CollectionFilterControls from './components/CollectionFilterControls/CollectionFilterControls';
import { createCard, EMPTY_CARD, refreshCollection } from './actions/cardActions';

import { hasAccessToken, updateAccessToken } from './utils/accessService';
import { getMechanics } from './actions/mechanicActions';
import { getTags } from './actions/tagActions';
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
import useActiveCardTab from './utils/useActiveCardTab';

const { Search } = Input;
const { confirm } = Modal;

const NO_CARD = '-1';

// Guard so the initial data fetch runs once per app load, not again under
// StrictMode's dev double-mount or on remount.
let didInit = false;

const MobileApp: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const pendingDraftRef = useRef<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');
  const [activeTabKey, setActiveTabKey] = useActiveCardTab();

  const { cards, newUuid, dispatch, annotationAccessor, user, currentUser } =
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

  // Defer the rapidly changing name filter so typing stays responsive while the
  // (potentially large) collection is re-sorted and re-filtered.
  const deferredNameFilter = useDeferredValue(cardNameFilter);

  const filteredCollection = useMemo(() => {
    const lastUpdated = (card: CardInterface): number => {
      const annotations = annotationAccessor[card.uuid];
      if (!annotations) return card.meta.lastUpdated;

      const lastAnnotation = annotations.reduce((a, b) => (a.datetime > b.datetime ? a : b));
      return Math.max(lastAnnotation.datetime, card.meta.lastUpdated);
    };

    return sortBy(mergedCollection, [(o: CardInterface) => -1 * lastUpdated(o)]).filter(o =>
      o.name.toLowerCase().includes(deferredNameFilter.toLowerCase()),
    );
  }, [mergedCollection, annotationAccessor, deferredNameFilter]);

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
        title: `${pendingDraft.name || oldCardName} has unsaved changes`,
        okText: 'Yes discard all changes',
        okType: 'danger',
        cancelText: 'Edit old card',
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

  const switchCardVariant = (id: string) => {
    const select = () => {
      setCardEditId(id);
      setCardViewId(id);
      setShowCardEditor(false);
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
    const collectionSpan = 24;

    const cardTabs = [
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

    return (
      <Row className={styles.fullHeight}>
        <Col span={collectionSpan} className={styles.collection}>
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            className={styles.tabs}
            items={cardTabs.map(tabObj => ({
              key: `tab-key-${tabObj.name}`,
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
        <Col span={24} className={styles.collectionWrapper}>
          {createGrid(filteredCollection)}
        </Col>
        <div className={styles.mobileControls}>
          <CollectionFilterControls collection={cards} setNameFilter={setCardNameFilter} />
          <Button
            aria-label="New card"
            icon={<AntIcon type="plus" />}
            type="primary"
            size="large"
            onClick={() => createCard(dispatch, currentUser)}
            className={styles.fullWidth}
          >
            New card
          </Button>
          <Button
            icon={<AntIcon type="reload" />}
            type="primary"
            onClick={refresh}
            className={styles.fullWidth}
          >
            Reload Collection
          </Button>
          <Button
            icon={<AntIcon type="swap" />}
            onClick={() =>
              confirm({
                title: 'Switch user?',
                okText: 'Yes, switch user',
                cancelText: 'Cancel',
                onOk() {
                  setCurrentUser(dispatch, UNKNOWN_CREATOR);
                },
              })
            }
            className={styles.fullWidth}
          >
            Switch User
          </Button>
        </div>
      </Row>
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
