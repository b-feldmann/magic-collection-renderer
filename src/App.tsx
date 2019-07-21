import React, { useEffect, useState } from 'react';
import CardInterface from './interfaces/CardInterface';
import { ColorType, LayoutType, RarityType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import OnlineCardProvider from './components/OnlineCardProvider/OnlineCardProvider';
import { Button, Col, Modal, Row, Tabs, Icon } from 'antd';
import CardEditor from './components/CardEditor/CardEditor';

import _ from 'lodash';

import styles from './App.module.scss';
import './card-modal.scss';

// @ts-ignore
import useResizeAware from 'react-resize-aware';

import fileDownload from 'js-file-download';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CardRender from './components/CardRender/CardRender';
import CardTableCollection from './components/CardTableCollection/CardTableCollection';
import useLocalStorage from './components/OnlineCardProvider/useLocalStorageHook';
import CollectionFilterControls, {
  CollectionFilterInterface
} from './components/CollectionFilterControls/CollectionFilterControls';
import cardToColor from './components/CardRender/cardToColor';

const { TabPane } = Tabs;
const { confirm } = Modal;

const NO_CARD = '-1';

interface MergedCardsInterface {
  [key: string]: CardInterface;
}

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<string>(NO_CARD);
  const [cardViewId, setCardViewId] = useState<string>(NO_CARD);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [layout, setLayout] = useLocalStorage(
    'collection-layout',
    LayoutType.GRID
  );

  const [collectionFilter, setCollectionFilter] = useState<
    CollectionFilterInterface
  >({ colors: {}, rarity: {}, types: {} });

  const [colSpanSetting, setColSpanSetting] = useState<number>(-1);

  const downloadJson = (card: CardInterface) => {
    const data = { ...card };

    fileDownload(JSON.stringify(data), `${card.name}.json`);
  };

  const downloadCollectionAsJson = (cards: CardInterface[]) => {
    const collectionData: object[] = [];

    cards.forEach(card => {
      collectionData.push(card);
    });

    fileDownload(JSON.stringify(collectionData), `magic-collection.json`);
  };

  const downloadImage = (id: string, name: string) => {
    const toCapture: HTMLElement | null = document.querySelector(
      `#card-id-${id}`
    );

    if (toCapture) {
      html2canvas(toCapture).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        pdf.addImage(imgData, 'PNG', 0, 0);
        pdf.save(`${name}.pdf`);
      });
    }
  };

  const viewCard = (id: string) => {
    setCardViewId(id);
    setShowCardModal(true);
  };

  const mergeWithTmpCard = (cards: CardInterface[]): MergedCardsInterface => {
    const merged: MergedCardsInterface = {};

    cards.forEach(card => {
      if (tmpCard && card.cardID === tmpCard.cardID)
        merged[card.cardID] = tmpCard;
      else merged[card.cardID] = card;
    });
    return merged;
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
        cardID={card.cardID}
        creator={card.creator}
        rarity={card.rarity}
        manaCost={card.manaCost}
        backFace
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

  const filterCards = (cards: CardInterface[]) =>
    _.sortBy(cards, [
      o =>
        _.indexOf(
          Object.values(ColorType),
          cardToColor(o.front.cardMainType, o.manaCost)
        ),
      o => _.indexOf(Object.values(RarityType), o.rarity),
      'cardMainType',
      o => o.front.name.toLowerCase()
    ]).filter(
      o =>
        collectionFilter.colors[
          cardToColor(o.front.cardMainType, o.manaCost)
        ] &&
        collectionFilter.rarity[o.rarity] &&
        collectionFilter.types[o.front.cardMainType]
    );

  const createTable = (
    cards: MergedCardsInterface,
    saveCard: (card: CardInterface) => void
  ) => (
    <CardTableCollection
      cards={filterCards(Object.values(cards))}
      currentEditId={cardEditId}
      editCard={id => {
        if (cardEditId === NO_CARD) openCardInEditor(id, '');
        else openCardInEditor(id, cards[cardEditId].name);
      }}
      downloadImage={id => downloadImage(id, cards[id].name)}
      downloadJson={id => downloadJson(cards[id])}
      viewCard={viewCard}
    />
  );

  const createGrid = (
    cards: MergedCardsInterface,
    saveCard: (card: CardInterface) => void
  ) => (
    <Row>
      <Col span={18} className={styles.collection}>
        <CardCollection
          cards={filterCards(Object.values(cards))}
          currentEditId={cardEditId}
          editCard={id => {
            if (cardEditId === NO_CARD) openCardInEditor(id, '');
            else openCardInEditor(id, cards[cardEditId].name);
          }}
          downloadImage={id => downloadImage(id, cards[id].name)}
          downloadJson={id => downloadJson(cards[id])}
          viewCard={viewCard}
          colSpan={colSpan}
        />
      </Col>
      <Col span={6} className={styles.editor}>
        <CardEditor
          card={cards[cardEditId]}
          saveCard={saveCard}
          saveTmpCard={setTmpCard}
        />
      </Col>
    </Row>
  );

  const tabKey: string = typeof layout === 'string' ? layout : 'grid';

  const availableColors: string[] = [];
  const availableTypes: string[] = [];
  const availableRarities: string[] = [];

  const updateAvailableCards = (cards: CardInterface[]) => {
    cards.forEach(card => {
      if (
        !availableColors.includes(
          cardToColor(card.front.cardMainType, card.manaCost)
        )
      )
        availableColors.push(
          cardToColor(card.front.cardMainType, card.manaCost)
        );

      if (!availableTypes.includes(card.front.cardMainType))
        availableTypes.push(card.front.cardMainType);

      if (!availableRarities.includes(card.rarity))
        availableRarities.push(card.rarity);
    });
  };

  return (
    <OnlineCardProvider
      render={(cards, saveCard, addCard) => {
        const mergedCards = mergeWithTmpCard(cards);
        updateAvailableCards(Object.values(mergedCards));
        return (
          <div>
            <Row className={styles.app}>
              <Col span={3}>
                <CollectionFilterControls
                  setCollectionColSpan={setColSpanSetting}
                  setCollectionFilter={setCollectionFilter}
                  availableColors={availableColors}
                  availableTypes={availableTypes}
                  availableRarities={availableRarities}
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
                        Rendered Cards
                      </span>
                    }
                    key="grid"
                  >
                    {layout === LayoutType.GRID &&
                      createGrid(mergedCards, saveCard)}
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
                    {layout === LayoutType.TABLE &&
                      createTable(mergedCards, saveCard)}
                  </TabPane>
                </Tabs>
              </Col>
              <div className={styles.addButton}>
                <Button
                  icon="plus"
                  type="primary"
                  onClick={addCard}
                  className={styles.fullWidth}
                >
                  Add Card
                </Button>
                <Button
                  icon="download"
                  type="primary"
                  onClick={() =>
                    downloadCollectionAsJson(Object.values(mergedCards))
                  }
                  className={styles.fullWidth}
                >
                  JSON
                </Button>
              </div>
            </Row>
            <Modal
              className={styles.modalCardViewWrapper}
              wrapClassName="card-view"
              title={`View ${mergedCards[cardViewId]}`}
              visible={showCardModal}
              onOk={() => setShowCardModal(false)}
              onCancel={() => setShowCardModal(false)}
            >
              {mergedCards[cardViewId] && (
                <div
                  className={`${styles.modalCardGroupWrapper} ${
                    mergedCards[cardViewId].back
                      ? styles.modalCardGroupWrapperDouble
                      : styles.modalCardGroupWrapperSingle
                  }`}
                >
                  <div className={styles.modalCardWrapper}>
                    <CardRender
                      {...mergedCards[cardViewId].front}
                      cardID={mergedCards[cardViewId].cardID}
                      creator={mergedCards[cardViewId].creator}
                      rarity={mergedCards[cardViewId].rarity}
                      manaCost={mergedCards[cardViewId].manaCost}
                    />
                  </div>
                  {mergedCards[cardViewId].back && (
                    <div className={styles.modalCardWrapper}>
                      {modalBack(mergedCards[cardViewId])}
                    </div>
                  )}
                </div>
              )}
            </Modal>
          </div>
        );
      }}
    />
  );
};

export default App;
