import React, { useState } from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import {
  CardMainType,
  ColorType,
  Creators,
  RarityType
} from '../../interfaces/enums';
import { Button, Col, Input, Row, Table } from 'antd';
// @ts-ignore
import Spreadsheet from 'react-spreadsheet';
import styles from './styles.module.css';
import CollectionFilterControls, {
  CollectionFilterInterface
} from '../CollectionFilterControls/CollectionFilterControls';
import cardToColor from '../CardRender/cardToColor';

import _ from 'lodash';
import { CardCollectionInterface } from '../CardCollection/CardCollection';

import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.css';

const CardTableCollection: React.FC<CardCollectionInterface> = ({
  cards = [],
  editCard,
  downloadJson,
  viewCard,
  currentEditId,
  setCollectionLayout
}: CardCollectionInterface) => {
  const [collectionFilter, setCollectionFilter] = useState<
    CollectionFilterInterface
  >({ colors: {}, rarity: {}, types: {} });

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

  const data: object[][] = [];

  filteredCards.map(card => {
    const cardData: any = {};
    const format = (value?: any) => (value ? value : '');
    const formatBoolean = (value?: boolean) => !!value;

    cardData.cardID = card.cardID;
    cardData.name = format(card.front.name);
    cardData.manaCost = format(card.manaCost);
    cardData.rarity = format(card.rarity);
    cardData.legendary = formatBoolean(card.front.legendary);
    cardData.cardMainType = format(card.front.cardMainType);
    cardData.cardSubTypes = format(card.front.cardSubTypes);
    cardData.cardText = format(card.front.cardText);
    cardData.flavourText = format(card.front.flavourText);
    cardData.flavourAuthor = format(card.front.flavourAuthor);
    cardData.cardStats = format(card.front.cardStats);
    cardData.creator = format(card.creator);
    cardData.cover = format(card.front.cover);
    // cardData.cover = <Input defaultValue={format(card.front.cover)} />;

    data.push(cardData);
  });

  return (
    <div>
      <Row>
        <Col span={3}>
          <CollectionFilterControls
            showColSpan={false}
            setCollectionLayout={setCollectionLayout}
            setCollectionColSpan={() => {}}
            setCollectionFilter={setCollectionFilter}
            availableColors={availableColors}
            availableTypes={availableTypes}
            availableRarities={availableRarities}
          />
        </Col>
        <Col span={21}>
          <HotTable
            allowHtml
            readOnly
            licenseKey="non-commercial-and-evaluation"
            data={data}
            colHeaders={[
              'View',
              'Name',
              'Mana Cost',
              'Rarity',
              'Legendary',
              'Card Type',
              'Sub Types',
              'Card Text',
              'Flavour Text',
              'Flavour Author',
              'Card Stats',
              'Creator',
              'Cover'
            ]}
            columns={[
              {
                data: 'cardID',
                renderer: (
                  instance,
                  td,
                  row,
                  col,
                  prop,
                  value,
                  cellProperties
                ) => {
                  const button = document.createElement('a');
                  button.text = 'Render';
                  button.onclick = () => viewCard(value);
                  td.appendChild(button);
                  // @ts-ignore

                  return td;
                }
              },
              { data: 'name' },
              { data: 'manaCost', width: '100px' },
              {
                data: 'rarity',
                editor: 'select',
                selectOptions: Object.values(RarityType)
              },
              { data: 'legendary', type: 'checkbox' },
              {
                data: 'cardMainType',
                editor: 'select',
                selectOptions: Object.values(CardMainType)
              },
              { data: 'cardSubTypes' },
              { data: 'cardText' },
              { data: 'flavourText' },
              { data: 'flavourAuthor' },
              { data: 'cardStats' },
              {
                data: 'creator',
                editor: 'select',
                selectOptions: Object.values(Creators)
              },
              { data: 'cover', width: '300px' }
            ]}
            autoColumnSize={true}
            rowHeaders={true}
            width="100%"
            height="100vh"
          />
        </Col>
      </Row>
    </div>
  );
};

export default CardTableCollection;
