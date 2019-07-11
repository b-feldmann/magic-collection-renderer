import React, { useState } from 'react';
import CardInterface from './interfaces/CardInterface';
import { SortType } from './interfaces/enums';
import CardCollection from './components/CardCollection/CardCollection';
import OfflineCardProvider from './components/OfflineCardProvider/OfflineCardProvider';
import { Col, message, Row } from 'antd';
import CardEditor from './components/CardEditor/CardEditor';

import styles from './App.module.scss';

import fileDownload from 'js-file-download';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const App: React.FC = () => {
  const [cardEditId, setCardEditId] = useState<number>(0);

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

  const viewCard = (card: CardInterface) => {
    message.error('Currently not implemented :(');
  };

  return (
    // @ts-ignore
    <OfflineCardProvider
      render={(
        cards: CardInterface[],
        saveCard: (card: CardInterface) => void
      ) => (
        <Row className={styles.app}>
          <Col span={16} className={styles.collection}>
            <CardCollection
              cards={cards}
              sortBy={SortType.Name}
              editCard={setCardEditId}
              downloadImage={id => downloadImage(id, cards[id].name)}
              downloadJson={id => downloadJson(cards[id])}
              viewCard={id => viewCard(cards[id])}
            />
          </Col>
          <Col span={8} className={styles.editor}>
            <CardEditor card={cards[cardEditId]} saveCard={saveCard} />
          </Col>
        </Row>
      )}
    />
  );
};

export default App;
