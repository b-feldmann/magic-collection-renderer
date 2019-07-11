import React, { useState } from 'react';
import CardInterface from './interfaces/CardInterface';
import { SortType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import OfflineCardProvider from './components/OfflineCardProvider/OfflineCardProvider';
import { Col, message, Modal, Row } from 'antd';
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
  const [cardEditId, setCardEditId] = useState<number>(0);
  const [cardViewId, setCardViewId] = useState<number>(0);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);

  const downloadJson = (card: CardInterface) => {
    const data = { ...card };

    fileDownload(JSON.stringify(data), `${card.name}.json`);
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
    const merged: CardInterface[] = [];

    cards.forEach(card => {
      if (tmpCard && card.cardID === tmpCard.cardID) merged.push(tmpCard);
      else merged.push(card);
    });
    return merged;
  };

  const openCardInEditor = (id: number, oldCardName: string) => {
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

  return (
    // @ts-ignore
    <OfflineCardProvider
      render={(
        cards: CardInterface[],
        saveCard: (card: CardInterface) => void
      ) => {
        const mergedCards = mergeWithTmpCard(cards);
        return (
          <div>
            <Row className={styles.app}>
              <Col span={16} className={styles.collection}>
                <CardCollection
                  cards={mergedCards}
                  sortBy={SortType.Name}
                  editCard={id => openCardInEditor(id, mergedCards[cardEditId].name)}
                  downloadImage={id => downloadImage(id, mergedCards[id].name)}
                  downloadJson={id => downloadJson(mergedCards[id])}
                  viewCard={viewCard}
                />
              </Col>
              <Col span={8} className={styles.editor}>
                <CardEditor
                  card={mergedCards[cardEditId]}
                  saveCard={saveCard}
                  saveTmpCard={setTmpCard}
                />
              </Col>
            </Row>
            <Modal
              wrapClassName="card-view"
              title={`View ${mergedCards[cardViewId]}`}
              visible={showCardModal}
              onOk={() => setShowCardModal(false)}
              onCancel={() => setShowCardModal(false)}
            >
              <CardRender {...mergedCards[cardViewId]} />
            </Modal>
          </div>
        );
      }}
    />
  );
};

export default App;
