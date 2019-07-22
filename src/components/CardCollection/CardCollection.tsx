import React, { useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import CardInterface from '../../interfaces/CardInterface';
import { Button, Col } from 'antd';
import CardRender from '../CardRender/CardRender';
import styles from './styles.module.css';
import ActionHover from '../ActionHover/ActionHover';
import PdfDownloadWrapper from '../PdfDownloadWrapper/PdfDownloadWrapper';

import CardFaceInterface from '../../interfaces/CardFaceInterface';

export interface CardCollectionInterface {
  cards?: CardInterface[];
  editCard: (id: string) => void;
  downloadImage: (id: string) => void;
  downloadJson: (id: string) => void;
  viewCard: (id: string) => void;
  currentEditId: string;
  colSpan: number;
  keywords: string[];
}

interface BackConfigInterface {
  [key: string]: boolean;
}

const CardCollection: React.FC<CardCollectionInterface> = ({
  cards = [],
  editCard,
  downloadJson,
  viewCard,
  currentEditId,
  colSpan,
  keywords
}: CardCollectionInterface) => {
  const [notParsedColSpan, setColSpan] = useState<number>(-1);

  const [showBackFaceConfig, setShowBackFaceConfig] = useState<
    BackConfigInterface
  >({});

  const getCardFace = (card: CardInterface): CardFaceInterface => {
    if (!card.back || !showBackFaceConfig[card.cardID]) return card.front;
    return { ...card.back, backFace: true };
  };

  const toggleShowBackConfig = (id: string) => {
    const newConfig = { ...showBackFaceConfig };
    newConfig[id] = !newConfig[id];
    setShowBackFaceConfig(newConfig);
  };

  return (
    <div>
      {cards.map((card, i) => {
        return (
          <Col className={styles.cardBox} span={colSpan} key={card.cardID}>
            <PdfDownloadWrapper
              fileName={card.name}
              render={downloadPdf => (
                <div>
                  <ActionHover
                    active={currentEditId === card.cardID}
                    northAction={{
                      icon: 'edit',
                      action: () => editCard(card.cardID)
                    }}
                    eastAction={{
                      icon: 'eye',
                      action: () => viewCard(card.cardID)
                    }}
                    southAction={{
                      icon: 'download',
                      action: downloadPdf
                    }}
                    westAction={{
                      icon: 'file-text',
                      action: () => downloadJson(card.cardID)
                    }}
                  >
                    <CardRender
                      {...getCardFace(card)}
                      cardID={card.cardID}
                      rarity={card.rarity}
                      manaCost={card.manaCost}
                      creator={card.creator}
                      keywords={keywords}
                      collectionNumber={i + 1}
                      collectionSize={cards.length}
                    />
                  </ActionHover>
                  {card.back && (
                    <Button
                      icon="swap"
                      className={styles.swapButton}
                      onClick={() => toggleShowBackConfig(card.cardID)}
                    />
                  )}
                </div>
              )}
            />
          </Col>
        );
      })}
    </div>
  );
};

export default CardCollection;
