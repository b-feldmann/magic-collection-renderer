import React, { useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import CardInterface from '../../interfaces/CardInterface';
import { ColorType, SortType } from '../../interfaces/enums';
import { Col, Row } from 'antd';
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

interface CardCollectionInterface {
  cards?: CardInterface[];
  sortBy: SortType;
  editCard: (id: number) => void;
  downloadImage: (id: number) => void;
  downloadJson: (id: number) => void;
  viewCard: (id: number) => void;
  currentEditId: number;
}

const CardCollection: React.FC<CardCollectionInterface> = ({
  cards = [],
  editCard,
  downloadJson,
  viewCard,
  currentEditId
}: CardCollectionInterface) => {
  const [notParsedColSpan, setColSpan] = useState<number>(-1);
  const [collectionFilter, setCollectionFilter] = useState<
    CollectionFilterInterface
  >({ colors: {}, rarity: {}, types: {} });

  const filteredCards = _.sortBy(cards, [
    o => _.indexOf(Object.values(ColorType), cardToColor(o.front)),
    'rarity',
    'cardMainType',
    o => o.name.toLowerCase()
  ]).filter(
    o =>
      collectionFilter.colors[cardToColor(o.front)] &&
      collectionFilter.rarity[o.rarity] &&
      collectionFilter.types[o.front.cardMainType]
  );

  const [resizeListener, sizes] = useResizeAware();

  const availableColors: string[] = [];
  const availableTypes: string[] = [];
  const availableRarities: string[] = [];
  cards.forEach(card => {
    if (!availableColors.includes(cardToColor(card.front)))
      availableColors.push(cardToColor(card.front));

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

  return (
    <div>
      <Row>
        <Col span={4}>
          <CollectionFilterControls
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
                        cardID={card.cardID}
                        rowNumber={card.rowNumber}
                        creator={card.creator}
                        rarity={card.rarity}
                        {...card.front}
                      />
                    </ActionHover>
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
