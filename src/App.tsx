import React, { useContext, useEffect, useState } from 'react';
import { Button, Col, Icon, Modal, Row, Tabs } from 'antd';
import _ from 'lodash';
// @ts-ignore
import useResizeAware from 'react-resize-aware';

import fileDownload from 'js-file-download';

import CardInterface from './interfaces/CardInterface';
import { CardMainType, ColorType, LayoutType, RarityType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';

import CardRender from './components/CardRender/CardRender';
import CardTableCollection from './components/CardTableCollection/CardTableCollection';
import useLocalStorage from './utils/useLocalStorageHook';
import CollectionFilterControls, {
  CollectionFilterInterface
} from './components/CollectionFilterControls/CollectionFilterControls';
import cardToColor from './components/CardRender/cardToColor';
import CardPixiRender from './components/CardPixiRender';
import { createCard, EMPTY_CARD, getAllCards } from './actions';
import CollectionStats from './components/CollectionStats/CollectionStats';

const { TabPane } = Tabs;
const { confirm } = Modal;

const NO_CARD = '-1';

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [layout, setLayout] = useLocalStorage('collection-layout', LayoutType.GRID);

  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterInterface>({
    colors: {},
    rarity: {},
    types: {}
  });

  const [colSpanSetting, setColSpanSetting] = useState<number>(-1);

  const { cards, newUuid, dispatch } = useContext<StoreType>(Store);

  const mergedCollection = [...cards.filter(card => card.uuid !== (tmpCard ? tmpCard.uuid : ''))];
  if (tmpCard) mergedCollection.push(tmpCard);

  const filteredCollection = _.sortBy(mergedCollection, [
    o => _.indexOf(Object.values(ColorType), cardToColor(o.front.cardMainType, o.manaCost).color),
    o => _.indexOf(Object.values(RarityType), o.rarity),
    o => _.indexOf(Object.values(CardMainType), o.front.cardMainType),
    o => o.front.name.toLowerCase()
  ]).filter(
    o =>
      collectionFilter.colors[cardToColor(o.front.cardMainType, o.manaCost).color] &&
      collectionFilter.rarity[o.rarity] &&
      collectionFilter.types[o.front.cardMainType]
  );

  const getCard = (collection: CardInterface[], uuid: string) =>
    filteredCollection.find(card => card.uuid === uuid) || EMPTY_CARD();

  useEffect(() => {
    if (newUuid) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (cardEditId === NO_CARD) openCardInEditor(newUuid, '');
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      else openCardInEditor(newUuid, getCard(filteredCollection, cardEditId).name);
    }
  }, [newUuid]);

  useEffect(() => getAllCards(dispatch), []);

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
      setCardViewId(id);
      setShowCardModal(true);
      return;
    }

    if (tmpCard) {
      confirm({
        title: `${oldCardName} has unsaved changes`,
        okText: 'Yes discard all changes',
        type: 'danger',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk() {
          setCardEditId(id);
          setCardViewId(id);
          setShowCardModal(true);
        }
      });
    } else {
      setCardEditId(id);
      setCardViewId(id);
      setShowCardModal(true);
    }
  };

  const modalBack = (card: CardInterface) => {
    if (!card.back) return <div />;

    return (
      <CardRender
        {...card.back}
        cardID={card.uuid}
        creator={card.creator}
        rarity={card.rarity}
        manaCost={card.manaCost}
        backFace
        keywords={[]}
        collectionNumber={0}
        collectionSize={0}
      />
    );
  };

  const [resizeListener, sizes] = useResizeAware();

  let colSpan = 4;
  if (colSpanSetting === -1) {
    if (sizes.width < 1400) colSpan = 6;
    if (sizes.width < 1100) colSpan = 8;
    if (sizes.width < 800) colSpan = 12;
  } else {
    colSpan = colSpanSetting;
  }

  const createTable = (collection: CardInterface[]) => (
    <CardTableCollection
      cards={collection}
      currentEditId={cardEditId}
      editCard={id => {
        const card = getCard(collection, cardEditId);
        if (card) openCardInEditor(id, card.name);
        else openCardInEditor(id, '');
      }}
      downloadImage={id => downloadImage(id, getCard(collection, id).name)}
      downloadJson={id => downloadJson(getCard(collection, id))}
      viewCard={viewCard}
    />
  );

  const createGrid = (collection: CardInterface[]) => (
    <Row>
      <Col span={18} className={styles.collection}>
        <CardCollection
          cards={filteredCollection}
          currentEditId={cardEditId}
          editCard={id => {
            if (cardEditId === NO_CARD) openCardInEditor(id, '');
            else openCardInEditor(id, getCard(collection, id).name);
          }}
          downloadImage={id => downloadImage(id, getCard(collection, id).name)}
          downloadJson={id => downloadJson(getCard(collection, id))}
          viewCard={viewCard}
          colSpan={colSpan}
          keywords={[]}
        />
      </Col>
      <Col span={6} className={styles.editor}>
        <CardEditor card={getCard(collection, cardEditId)} saveTmpCard={setTmpCard} />
      </Col>
    </Row>
  );

  const tabKey: string = typeof layout === 'string' ? layout : 'grid';

  return (
    <div>
      <Row className={styles.app}>
        <Col span={3}>
          <CollectionStats collection={mergedCollection} />
          <CollectionFilterControls
            setCollectionColSpan={setColSpanSetting}
            setCollectionFilter={setCollectionFilter}
            showColSpan={layout === LayoutType.GRID}
          />
        </Col>
        <Col span={21}>
          {resizeListener}
          <Tabs
            activeKey={tabKey}
            tabPosition="top"
            // @ts-ignore
            onChange={(key: string) => setLayout(key)}
          >
            <TabPane
              tab={
                <span>
                  <Icon type="file-image" />
                  <span>Rendered Cards</span>
                </span>
              }
              key="grid"
            >
              {layout === LayoutType.GRID && createGrid(filteredCollection)}
            </TabPane>
            <TabPane
              tab={
                <span>
                  <Icon type="table" />
                  Spreadsheet
                </span>
              }
              key="table"
            >
              {layout === LayoutType.TABLE && createTable(filteredCollection)}
            </TabPane>
          </Tabs>
        </Col>
        <div className={styles.addButton}>
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
          <Button
            icon="reload"
            type="primary"
            onClick={() => getAllCards(dispatch)}
            className={styles.fullWidth}
          >
            Reload Collection
          </Button>
        </div>
      </Row>
      <Modal
        className={styles.modalCardViewWrapper}
        wrapClassName="card-view"
        title={`View ${getCard(filteredCollection, cardViewId)}`}
        visible={showCardModal}
        onOk={() => setShowCardModal(false)}
        onCancel={() => setShowCardModal(false)}
      >
        {getCard(filteredCollection, cardViewId) && (
          <div
            className={`${styles.modalCardGroupWrapper} ${
              getCard(filteredCollection, cardViewId).back
                ? styles.modalCardGroupWrapperDouble
                : styles.modalCardGroupWrapperSingle
            }`}
          >
            <div className={styles.modalCardWrapper}>
              <CardRender
                {...getCard(filteredCollection, cardViewId).front}
                cardID={getCard(filteredCollection, cardViewId).uuid}
                creator={getCard(filteredCollection, cardViewId).creator}
                rarity={getCard(filteredCollection, cardViewId).rarity}
                manaCost={getCard(filteredCollection, cardViewId).manaCost}
                keywords={[]}
                collectionNumber={0}
                collectionSize={0}
              />
            </div>
            {getCard(filteredCollection, cardViewId).back && (
              <div className={styles.modalCardWrapper}>
                {modalBack(getCard(filteredCollection, cardViewId))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;
