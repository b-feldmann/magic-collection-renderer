import React, { useState } from 'react';
import CardInterface from './interfaces/CardInterface';
import { LayoutType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import OnlineCardProvider from './components/OnlineCardProvider/OnlineCardProvider';
import { Button, Col, Modal, Row } from 'antd';
import CardEditor from './components/CardEditor/CardEditor';

import styles from './App.module.scss';
import './card-modal.scss';

import fileDownload from 'js-file-download';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CardRender from './components/CardRender/CardRender';
import CardTableCollection from './components/CardTableCollection/CardTableCollection';

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
  const [layout, setLayout] = useState<LayoutType>(LayoutType.GRID);

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

  return (
    // @ts-ignore
    <OnlineCardProvider
      render={(
        cards: CardInterface[],
        saveCard: (card: CardInterface) => void,
        addCard: () => void
      ) => {
        const mergedCards = mergeWithTmpCard(cards);
        return (
          <div>
            <Row className={styles.app}>
              {layout === LayoutType.GRID && (
                <Row>
                  <Col span={18} className={styles.collection}>
                    <CardCollection
                      cards={Object.values(mergedCards)}
                      currentEditId={cardEditId}
                      editCard={id => {
                        if (cardEditId === NO_CARD) openCardInEditor(id, '');
                        else openCardInEditor(id, mergedCards[cardEditId].name);
                      }}
                      downloadImage={id =>
                        downloadImage(id, mergedCards[id].name)
                      }
                      downloadJson={id => downloadJson(mergedCards[id])}
                      viewCard={viewCard}
                      setCollectionLayout={layout => setLayout(layout)}
                    />
                  </Col>
                  <Col span={6} className={styles.editor}>
                    <CardEditor
                      card={mergedCards[cardEditId]}
                      saveCard={saveCard}
                      saveTmpCard={setTmpCard}
                    />
                  </Col>
                </Row>
              )}
              {layout === LayoutType.TABLE && (
                <CardTableCollection
                  cards={Object.values(mergedCards)}
                  currentEditId={cardEditId}
                  editCard={id => {
                    if (cardEditId === NO_CARD) openCardInEditor(id, '');
                    else openCardInEditor(id, mergedCards[cardEditId].name);
                  }}
                  downloadImage={id => downloadImage(id, mergedCards[id].name)}
                  downloadJson={id => downloadJson(mergedCards[id])}
                  viewCard={viewCard}
                  setCollectionLayout={layout => setLayout(layout)}
                />
              )}
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
