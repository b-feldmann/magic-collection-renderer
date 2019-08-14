import React, { useContext, useEffect, useState } from 'react';
import { Button, Col, Input, Modal, Row } from 'antd';
import _ from 'lodash';
// @ts-ignore
import useResizeAware from 'react-resize-aware';
import fileDownload from 'js-file-download';
import useWindowDimensions from './useWindowDimensions';

import CardInterface from './interfaces/CardInterface';
import { ColorType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import CardEditor from './components/CardEditor/CardEditor';

import { Store, StoreType } from './store';

import styles from './App.module.scss';
import './card-modal.scss';

import CardRender from './components/CardRender/CardRender';
import CollectionFilterControls, {
  CollectionFilterInterface
} from './components/CollectionFilterControls/CollectionFilterControls';
import cardToColor from './components/CardRender/cardToColor';
import { createCard, EMPTY_CARD, refreshCollection } from './actions/cardActions';
import CollectionStats from './components/CollectionStats/CollectionStats';

import { hasAccessToken, updateAccessToken } from './dropboxService';
import {getMechanics} from "./actions/mechanicActions";

const { Search } = Input;
const { confirm } = Modal;

const NO_CARD = '-1';

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [cardNameFilter, setCardNameFilter] = useState<string>('');

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
    // o => _.indexOf(Object.values(RarityType), o.rarity),
    // o => _.indexOf(Object.values(CardMainType), o.front.cardMainType),
    o => o.front.name.toLowerCase()
  ]).filter(
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
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (cardEditId === NO_CARD) openCardInEditor(newUuid, '');
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      else openCardInEditor(newUuid, getCard(filteredCollection, cardEditId).name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newUuid]);

  useEffect(() => {
    refreshCollection(dispatch);
    getMechanics(dispatch);
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

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

  const modalBack = (card: CardInterface, width: number) => {
    if (!card.back) return <div />;

    return (
      <CardRender
        containerWidth={width}
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

  const { width, height } = useWindowDimensions();

  const isMobile = width < 900 && height < 900;
  const isLandScape = width > height;

  const wOffset = isMobile ? 50 : 100;
  const hOffset = isMobile ? 50 : 200;

  const dimFactor = 488 / 680;

  let modalMaxWidth = (width / 100) * 62.5 - wOffset;
  if (isMobile) {
    if (isLandScape) modalMaxWidth = (width / 24) * 15 - wOffset;
    else modalMaxWidth = width - wOffset;
  }
  const modalMaxHeight = height - hOffset;
  const modalSingleCardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor);
  const modalDoubleCardWidth = Math.min(modalMaxWidth, modalMaxHeight * dimFactor * 2);

  const [resizeListener, sizes] = useResizeAware();

  let colSpan = 4;
  if (colSpanSetting === -1) {
    if (sizes.width < 1400) colSpan = 6;
    if (sizes.width < 1100) colSpan = 8;
    if (sizes.width < 800) colSpan = 12;
  } else {
    colSpan = colSpanSetting;
  }

  if (isMobile) {
    if (isLandScape) colSpan = 8;
    else colSpan = 12;
  }

  const createGrid = (collection: CardInterface[]) => {
    let collectionSpan = 18;
    let editorSpan = 6;

    if (isMobile) {
      if (isLandScape) {
        collectionSpan = 15;
        editorSpan = 9;
      } else {
        collectionSpan = 24;
        editorSpan = 0;
      }
    }

    return (
      <Row>
        <Col span={collectionSpan} className={styles.collection}>
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
      {isMobile && isLandScape && (
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
          <CollectionStats collection={mergedCollection} />
          <CollectionFilterControls
            collection={cards}
            setCollectionColSpan={setColSpanSetting}
            setCollectionFilter={setCollectionFilter}
            showColSpan
            setNameFilter={setCardNameFilter}
          />
        </Col>
        <Col span={isMobile ? 24 : 21}>
          {resizeListener}
          {createGrid(filteredCollection)}
        </Col>
        {!isMobile && (
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
              onClick={() => refreshCollection(dispatch)}
              className={styles.fullWidth}
            >
              Reload Collection
            </Button>
          </div>
        )}
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
            style={{
              width: getCard(filteredCollection, cardViewId).back
                ? modalDoubleCardWidth
                : modalSingleCardWidth
            }}
          >
            <div className={styles.modalCardWrapper}>
              <CardRender
                containerWidth={
                  getCard(filteredCollection, cardViewId).back
                    ? modalDoubleCardWidth / 2
                    : modalSingleCardWidth
                }
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
                {modalBack(
                  getCard(filteredCollection, cardViewId),
                  getCard(filteredCollection, cardViewId).back
                    ? modalDoubleCardWidth / 2
                    : modalSingleCardWidth
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
      {isMobile && !isLandScape && (
        <div className={styles.landscapeReminder}>Use Landscape Mode to edit cards!</div>
      )}
    </div>
  );
};

export default App;
