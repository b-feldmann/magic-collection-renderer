import React, { useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import CardInterface from '../../interfaces/CardInterface';
import {
  ColorType,
  LayoutType,
  RarityType
} from '../../interfaces/enums';
import { Button, Col, Row } from 'antd';
import CardRender from '../CardRender/CardRender';
import styles from './styles.module.css';
import ActionHover from '../ActionHover/ActionHover';
import PdfDownloadWrapper from '../PdfDownloadWrapper/PdfDownloadWrapper';
import CollectionFilterControls, {
  CollectionFilterInterface
} from '../CollectionFilterControls/CollectionFilterControls';
import cardToColor from '../CardRender/cardToColor';

import _ from 'lodash';

// @ts-ignore
import useResizeAware from 'react-resize-aware';
import CardFaceInterface from '../../interfaces/CardFaceInterface';

export interface CardCollectionInterface {
  cards?: CardInterface[];
  editCard: (id: string) => void;
  downloadImage: (id: string) => void;
  downloadJson: (id: string) => void;
  viewCard: (id: string) => void;
  currentEditId: string;
  setCollectionLayout: (layout: LayoutType) => void;
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
  setCollectionLayout
}: CardCollectionInterface) => {
  const [notParsedColSpan, setColSpan] = useState<number>(-1);
  const [collectionFilter, setCollectionFilter] = useState<
    CollectionFilterInterface
  >({ colors: {}, rarity: {}, types: {} });

  const [showBackFaceConfig, setShowBackFaceConfig] = useState<
    BackConfigInterface
  >({});

  const filteredCards = _.sortBy(cards, [
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
      collectionFilter.colors[cardToColor(o.front.cardMainType, o.manaCost)] &&
      collectionFilter.rarity[o.rarity] &&
      collectionFilter.types[o.front.cardMainType]
  );

  const [resizeListener, sizes] = useResizeAware();

  const availableColors: string[] = [];
  const availableTypes: string[] = [];
  const availableRarities: string[] = [];
  cards.forEach(card => {
    if (
      !availableColors.includes(
        cardToColor(card.front.cardMainType, card.manaCost)
      )
    )
      availableColors.push(cardToColor(card.front.cardMainType, card.manaCost));

    if (!availableTypes.includes(card.front.cardMainType))
      availableTypes.push(card.front.cardMainType);

    if (!availableRarities.includes(card.rarity))
      availableRarities.push(card.rarity);
  });

  let colSpan = 4;
  if (notParsedColSpan === -1) {
    if (sizes.width < 1400) colSpan = 6;
    if (sizes.width < 1100) colSpan = 8;
    if (sizes.width < 800) colSpan = 12;
  } else {
    colSpan = notParsedColSpan;
  }

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
      <Row>
        <Col span={4}>
          <CollectionFilterControls
            setCollectionLayout={setCollectionLayout}
            setCollectionColSpan={setColSpan}
            setCollectionFilter={setCollectionFilter}
            availableColors={availableColors}
            availableTypes={availableTypes}
            availableRarities={availableRarities}
          />
        </Col>
        <Col span={20} className={styles.collection}>
          {resizeListener}
          {filteredCards.map(card => {
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
        </Col>
      </Row>
    </div>
  );
};

export default CardCollection;
