import React, { useContext, useEffect, useState } from 'react';
import { Button, Col, Input, Modal, Row, Select } from 'antd';
import _ from 'lodash';

import fileDownload from 'js-file-download';
import useWindowDimensions from './useWindowDimensions';

import CardInterface from './interfaces/CardInterface';
import { ColorType, Creators, SortByType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';

import CollectionFilterControls, {
  CollectionFilterInterface
} from './components/CollectionFilterControls/CollectionFilterControls';
import cardToColor from './components/CardRender/cardToColor';
import { createCard, EMPTY_CARD, refreshCollection } from './actions/cardActions';

import { hasAccessToken, updateAccessToken } from './dropboxService';
import { getMechanics } from './actions/mechanicActions';
import MechanicModal from './components/MechanicModal/MechanicModal';
import useLocalStorage from './utils/useLocalStorageHook';
import ChangeLogModal from './components/ChangeLogModal/ChangeLogModal';
import BigCardRenderModal from './components/BigCardRenderModal/BigCardRenderModal';
import { getAnnotations } from './actions/annotationActions';

const { Search } = Input;
const { confirm } = Modal;

const NO_CARD = '-1';

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');
  const [mechanicsVisible, setMechanicsVisible] = useState(false);
  const [sortBy, setSortBy] = useLocalStorage('mtg-funset:SortBy', SortByType.LastUpdated);
  const [seenCardUuids, setSeenCardUuids] = useLocalStorage(
    'mtg-funset:seen-card-uuids',
    '[]',
    true
  );

  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterInterface>({
    colors: {},
    rarity: {},
    types: {}
  });

  const [colSpanSetting, setColSpanSetting] = useState<number>(-1);

  const { cards, newUuid, dispatch, annotationAccessor } = useContext<StoreType>(Store);

  const mergedCollection = [...cards.filter(card => card.uuid !== (tmpCard ? tmpCard.uuid : ''))];
  if (tmpCard) mergedCollection.push(tmpCard);

  const lastUpdated = (card: CardInterface) => {
    const annotations = annotationAccessor[card.uuid];
    if (!annotations) return card.lastUpdated;

    return annotations.reduce((a, b) => (a.datetime > b.datetime ? a : b)).datetime;
  };

  const sortList = [];
  if (sortBy === SortByType.Color) {
    sortList.push((o: CardInterface) =>
      _.indexOf(Object.values(ColorType), cardToColor(o.front.cardMainType, o.manaCost).color)
    );
    sortList.push((o: CardInterface) => o.front.name.toLowerCase());
  }
  if (sortBy === SortByType.Creator) {
    sortList.push((o: CardInterface) =>
      o.creator === Creators.UNKNOWN ? 999 : _.indexOf(Object.values(Creators), o.creator)
    );
    sortList.push((o: CardInterface) =>
      _.indexOf(Object.values(ColorType), cardToColor(o.front.cardMainType, o.manaCost).color)
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
      addSeenCard(newUuid);
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

  const addSeenCard = (uuid: string) => {
    setSeenCardUuids([...seenCardUuids, uuid]);
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

  const { width, height } = useWindowDimensions();

  const isMobile = width < 900 && height < 900;
  const isLandscape = width > height;

  const createGrid = (collection: CardInterface[]) => {
    let collectionSpan = 18;
    let editorSpan = 6;

    if (isMobile) {
      if (isLandscape) {
        collectionSpan = 15;
        editorSpan = 9;
      } else {
        collectionSpan = 24;
        editorSpan = 0;
      }
    }

    const seenCardObject: { [key: string]: boolean } = {};
    seenCardUuids.forEach((uuid: string) => {
      seenCardObject[uuid] = true;
    });

    return (
      <Row>
        <ChangeLogModal />
        <MechanicModal visible={mechanicsVisible} setVisible={setMechanicsVisible} />
        <Col span={collectionSpan} className={styles.collection}>
          <CardCollection
            cards={filteredCollection}
            currentEditId={cardEditId}
            editCard={id => {
              if (cardEditId === NO_CARD) openCardInEditor(id, '');
              else openCardInEditor(id, getCard(collection, cardEditId).name);
            }}
            downloadImage={id => downloadImage(id, getCard(collection, id).name)}
            downloadJson={id => downloadJson(getCard(collection, id))}
            colSpanSetting={colSpanSetting}
            seenCardUuids={seenCardObject}
            addSeenCard={addSeenCard}
            isMobile={isMobile}
            isLandscape={isLandscape}
          />
        </Col>
        <Col
          span={editorSpan}
          className={`${styles.editor} ${isMobile ? styles.editorMobile : ''}`}
        >
          <CardEditor card={getCardUndefined(collection, cardEditId)} saveTmpCard={setTmpCard} />
        </Col>
      </Row>
    );
  };

  if (!hasAccessToken()) {
    return (
      <Search
        placeholder="Input Api Key"
        enterButton="Enter"
        size="large"
        onSearch={value => {
          updateAccessToken(value);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div>
      {isMobile && isLandscape && (
        <div className={styles.landscapeAddButton}>
          <Button
            icon="plus"
            type="primary"
            onClick={() => createCard(dispatch)}
            className={styles.fullWidth}
          >
            Add Card
          </Button>
        </div>
      )}
      <Row className={styles.app}>
        <Col span={isMobile ? 0 : 3}>
          <div className={styles.sortControls}>
            <h3>Filter Collection By</h3>
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
            showColSpan
            setNameFilter={setCardNameFilter}
          />
        </Col>
        <Col span={isMobile ? 24 : 21}>{createGrid(filteredCollection)}</Col>
        {!isMobile && (
          <div className={styles.addButton}>
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
              onClick={() => createCard(dispatch)}
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
        )}
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
      {isMobile && !isLandscape && (
        <div className={styles.landscapeReminder}>Use Landscape Mode to edit cards!</div>
      )}
    </div>
  );
};

export default App;
