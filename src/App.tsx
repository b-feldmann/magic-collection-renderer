import React, { useState } from 'react';
import CardInterface from './interfaces/CardInterface';
import { SortType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import OfflineCardProvider from './components/OfflineCardProvider/OfflineCardProvider';
import { Button, Col, message, Modal, Row } from 'antd';
import CardEditor from './components/CardEditor/CardEditor';

import styles from './App.module.scss';
import './card-modal.scss';

import fileDownload from 'js-file-download';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CardRender from './components/CardRender/CardRender';

const { confirm } = Modal;

const App: React.FC = () => {
  const [tmpCard, setTmpCard] = useState<CardInterface | null>(null);
  const [cardEditId, setCardEditId] = useState<number>(-1);
  const [cardViewId, setCardViewId] = useState<number>(-1);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);

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

  const downloadImage = (id: number, name: string) => {
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

  const viewCard = (id: number) => {
    setCardViewId(id);
    setShowCardModal(true);
  };

  const mergeWithTmpCard = (cards: CardInterface[]) => {
    if (tmpCard && tmpCard.cardID === -1) return cards;

    const merged: CardInterface[] = [];

    cards.forEach(card => {
      if (tmpCard && card.cardID === tmpCard.cardID) merged.push(tmpCard);
      else merged.push(card);
    });
    return merged;
  };

  const openCardInEditor = (id: number, oldCardName: string) => {
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
        cardID={card.cardID}
        rowNumber={card.rowNumber}
        creator={card.creator}
        rarity={card.rarity}
        {...card.back}
      />
    );
  };

  return (
    // @ts-ignore
    <OfflineCardProvider
      render={(
        cards: CardInterface[],
        saveCard: (card: CardInterface) => void,
        addCard: () => void
      ) => {
        const mergedCards = mergeWithTmpCard(cards);
        return (
          <div>
            <Row className={styles.app}>
              <Col span={18} className={styles.collection}>
                <CardCollection
                  cards={mergedCards}
                  sortBy={SortType.Name}
                  currentEditId={cardEditId}
                  editCard={id => {
                    if (cardEditId === -1) openCardInEditor(id, '');
                    else openCardInEditor(id, mergedCards[cardEditId].name);
                  }}
                  downloadImage={id => downloadImage(id, mergedCards[id].name)}
                  downloadJson={id => downloadJson(mergedCards[id])}
                  viewCard={viewCard}
                />
              </Col>
              <Col span={6} className={styles.editor}>
                <CardEditor
                  card={mergedCards[cardEditId]}
                  saveCard={saveCard}
                  saveTmpCard={setTmpCard}
                />
                <div className={styles.addButton}>
                  <Button
                    size="large"
                    icon="plus"
                    type="primary"
                    shape="round"
                    onClick={addCard}
                    className={styles.fullWidth}
                  >
                    Add Card
                  </Button>
                  <Button
                    size="large"
                    icon="download"
                    type="primary"
                    shape="round"
                    onClick={() => downloadCollectionAsJson(mergedCards)}
                    className={styles.fullWidth}
                  >
                    JSON
                  </Button>
                </div>
              </Col>
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
                      cardID={mergedCards[cardViewId].cardID}
                      rowNumber={mergedCards[cardViewId].rowNumber}
                      creator={mergedCards[cardViewId].creator}
                      rarity={mergedCards[cardViewId].rarity}
                      {...mergedCards[cardViewId].front}
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
