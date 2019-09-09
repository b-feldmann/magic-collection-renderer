import React, { useContext } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '@saeris/react-mana';

import TextResize from 'react-resize-text';

import { CardMainType, RarityType } from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor } from '../../utils/cardToColor';

import styles from './TemplatingCardRender.module.scss';
import planeswalkerStyles from './Planeswalker.module.scss';

import {
  getFallbackCover,
  getLoyaltyIcon,
  getPlaneswalkerMainframe,
  getPlaneswalkerPt,
  getRarityIcon
} from './assetLoader';
import {
  injectManaIcons,
  injectMechanics,
  injectName,
  injectQuotationMarks
} from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import getRarityCode from '../../utils/getRarityCode';
import parseCollectionNumber from '../../utils/parseCollectionNumber';

interface PlaneswalkerCardRenderProps {
  name: string;
  rarity: RarityType;
  creator?: string;
  cardID: string;
  manaCost: string;
  legendary?: boolean;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  backFace?: boolean;
  collectionNumber: number;
  collectionSize: number;
  containerWidth?: number;
}

const CARD_WIDTH = 720.0;
const CARD_HEIGHT = 1020.0;

const PlaneswalkerCardRender = (cardRender: PlaneswalkerCardRenderProps) => {
  const { legendary, cardMainType, cardSubTypes } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText = '', flavourAuthor, cardID } = cardRender;
  const { backFace, collectionNumber, collectionSize, rarity } = cardRender;
  const { containerWidth = CARD_WIDTH } = cardRender;

  const { mechanics } = useContext<StoreType>(Store);

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  let lines: 2 | 3 | 4 = 3;
  if (cardText.length === 2) lines = 2;
  else if (cardText.length === 4) lines = 4;

  const { color, orderedCost } = getColor(manaCost);
  const mainframe = getPlaneswalkerMainframe(color, lines);
  const pt = getPlaneswalkerPt();

  const parsePlaneswalkerLine = (line: string) => {
    if (!line) return { loyalty: '', text: '', loyaltyImage: '' };

    const splitIndex = line.indexOf('|');
    if (splitIndex === -1) return { loyalty: '', text: line, loyaltyImage: '' };

    const loyalty = line
      .substring(0, splitIndex)
      .replace('{', '')
      .replace('}', '')
      .toUpperCase();

    return { loyalty, text: line.substring(splitIndex + 1), loyaltyImage: getLoyaltyIcon(loyalty) };
  };

  return (
    <div style={{ height: `${getHeight(containerWidth)}px` }}>
      <div
        id={`card-id-${cardID}`}
        style={{
          transform: `scale(${resizeFactor(containerWidth)})`,
          transformOrigin: 'top left',
          width: `${(CARD_WIDTH / containerWidth) * 100}%`
        }}
      >
        <div
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`
          }}
          className={`${styles.cardRender} ${styles.planeswalker} ${lines === 4 && styles.lines4}`}
        >
          <ImageLoader
            src={cover || getFallbackCover()}
            alt="cover"
            fallBackColor="black"
            className={styles.cover}
          />
          <ImageLoader src={mainframe} className={styles.mainframe} fallBackColor="#eed66b" />
          <ImageLoader src={getRarityIcon(rarity)} alt="" className={styles.rarity} />

          {!backFace && <div className={styles.cost}>{injectManaIcons(orderedCost, true)}</div>}

          <div className={styles.title}>{name}</div>
          <div className={styles.type}>
            {legendary ? 'Legendary ' : ''}
            {cardMainType}
            {cardSubTypes ? ` – ${cardSubTypes}` : ''}
          </div>

          <div className={planeswalkerStyles[`lines${lines}`]}>
            {cardText.map((val, i) => {
              const { loyalty, text, loyaltyImage } = parsePlaneswalkerLine(val);
              return (
                <div>
                  <div className={planeswalkerStyles[`loyaltyIcon${i + 1}`]}>
                    <img src={loyaltyImage} alt="" />
                  </div>
                  <div className={planeswalkerStyles[`loyaltyIcon${i + 1}`]}>
                    <p>{loyalty}</p>
                  </div>
                  <div className={planeswalkerStyles[`loyaltyText${i + 1}`]}>
                    <TextResize
                      defaultFontSize={20}
                      maxFontSize={32}
                      minFontSize={14}
                      className={styles.textWrap}
                    >
                      <div>
                        {injectQuotationMarks(
                          injectManaIcons(injectName(injectMechanics(text, mechanics, name), name))
                        )}
                      </div>
                    </TextResize>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <img className={styles.overlay} src={pt} alt="" />
            <div className={styles.stats}>
              <div>{cardStats}</div>
            </div>
          </div>

          <div className={styles.collectionBlock}>
            {`${parseCollectionNumber(collectionNumber)}/${parseCollectionNumber(collectionSize)}`}
            {` ${getRarityCode(rarity)}`}
          </div>
          <div className={styles.collectionBlock2}>
            MFS &#x2022; EN
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={styles.copyrightStats}>
            &#8482; &amp; &#169; 2019 Wizards of the Coast
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaneswalkerCardRender;
