import React from 'react';
// import CardFaceInterface from '../../interfaces/CardFaceInterface';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';
// @ts-ignore

import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';
import CardInterface from '../../interfaces/CardInterface';

export interface CardTableCollectionInterface {
  cards?: CardInterface[];
  editCard: (id: string) => void;
  downloadImage: (id: string) => void;
  downloadJson: (id: string) => void;
  viewCard: (id: string) => void;
  currentEditId: string;
}

const CardTableCollection: React.FC<CardTableCollectionInterface> = ({
  cards = [],
  editCard,
  downloadJson,
  viewCard,
  currentEditId
}: CardTableCollectionInterface) => {
  const data: object[][] = [];

  cards.map(card => {
    const cardData: any = {};
    const format = (value?: any) => (value ? value : '');
    const formatBoolean = (value?: boolean) => !!value;

    cardData.cardID = card.uuid;
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
            data: 'uuid',
            renderer: (instance, td, row, col, prop, value, cellProperties) => {
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
        height="calc(100vh - 60px)"
      />
    </div>
  );
};

export default CardTableCollection;
