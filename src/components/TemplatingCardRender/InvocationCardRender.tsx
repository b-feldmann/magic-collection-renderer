import React, { useContext } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '@saeris/react-mana';

import TextResize from 'react-resize-text';

import { CardMainType, RarityType } from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor } from '../../utils/cardToColor';

import styles from './TemplatingCardRender.module.scss';
import {
  getFallbackCover,
  getInvocationMainframe,
  getInvocationPt,
  getRarityIcon
} from './assetLoader';
import {
  injectManaIcons,
  injectMechanics,
  injectName,
  injectQuotationMarks
} from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';

// import TextResizer from '../TextResizer/TextResizer';

interface InvocationCardRenderProps {
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

const CARD_WIDTH = 745.0;
const CARD_HEIGHT = 1040.0;

const InvocationCardRender = (cardRender: InvocationCardRenderProps) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText = '', flavourAuthor, cardID } = cardRender;
  const { backFace, collectionNumber, collectionSize } = cardRender;
  const { containerWidth = CARD_WIDTH } = cardRender;

  const { mechanics } = useContext<StoreType>(Store);

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  const isCreature =
    cardMainType === CardMainType.Creature || cardMainType === CardMainType.ArtifactCreature;

  const { color, orderedCost } = getColor(manaCost);
  const mainframe = getInvocationMainframe(color);
  const pt = getInvocationPt();

  const parseCollectionNumber = (n: number): string => {
    const res = n.toString(10);
    if (res.length === 0) return '000';
    if (res.length === 1) return `00${res}`;
    if (res.length === 2) return `0${res}`;
    return res;
  };

  const parseStats = (): { power: string; toughness: string } => {
    if (!cardStats) return { power: '0', toughness: '0' };

    const split = cardStats.split('/');
    if (split.length > 2) return { power: '0', toughness: '0' };
    if (split.length === 1) return { power: split[0], toughness: '0' };

    return { power: split[0] || '0', toughness: split[1] || '0' };
  };

  return (
    <div style={{ height: `${getHeight(containerWidth)}px` }}>
      <div
        id={`card-id-${cardID}`}
        style={{
          transform: `scaleX(${resizeFactor(containerWidth)}) scaleY(${resizeFactor(
            (containerWidth * CARD_HEIGHT) / 1020.0
          )})`,
          transformOrigin: 'top left',
          width: `${(CARD_WIDTH / containerWidth) * 100}%`
        }}
      >
        <div
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`
          }}
          className={`${styles.cardRender} ${styles.invocation}`}
        >
          <ImageLoader src={cover || getFallbackCover()} alt="cover" className={styles.cover} />

          <ImageLoader src={mainframe} className={styles.mainframe} fallBackColor="#eed66b" />

          {cardRender.cardMainType !== CardMainType.Land && !backFace && (
            <div className={styles.cost}>{injectManaIcons(orderedCost, true)}</div>
          )}

          <ImageLoader src={getRarityIcon(RarityType.Common)} alt="" className={styles.rarity} />

          <div className={styles.title}>{name}</div>
          <div className={styles.type}>
            {legendary ? 'Legendary ' : ''}
            {cardMainType}
            {cardSubTypes ? ` – ${cardSubTypes}` : ''}
          </div>

          <div className={styles.text}>
            <TextResize
              defaultFontSize={20}
              maxFontSize={32}
              minFontSize={14}
              className={styles.textWrap}
            >
              <div>
                {cardText.map(val => (
                  <p>
                    {injectQuotationMarks(
                      injectManaIcons(injectName(injectMechanics(val, mechanics, name), name))
                    )}
                  </p>
                ))}
                {flavourText && (
                  <div className={styles.flavour}>
                    <div className={styles.flavourSeparator} />
                    {flavourAuthor
                      ? `“${injectQuotationMarks(injectName(flavourText, name))}”`
                      : injectQuotationMarks(injectName(flavourText, name))}
                    {flavourAuthor && (
                      <span>
                        <br />
                        {`— ${flavourAuthor}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </TextResize>
          </div>

          {isCreature && (
            <div>
              <img className={styles.overlay} src={pt} alt="" />
              <div className={styles.stats}>
                <div>{parseStats().power}</div>
                <div>{parseStats().toughness}</div>
              </div>
            </div>
          )}

          <div className={styles.collectionBlock}>
            {`${parseCollectionNumber(collectionNumber)}/${parseCollectionNumber(collectionSize)} `}
            MFS &#x2022; EN
          </div>
          <div className={styles.collectionBlock2}>
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={styles.copyright}>&#8482; &amp; &#169; 2019 Wizards of the Coast</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvocationCardRender);
