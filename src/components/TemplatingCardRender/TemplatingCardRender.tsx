import React, { useContext } from 'react';

import 'mana-font/css/mana.css';

import { BasicLandType, CardMainType, RarityType } from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor, getColorIdentity, getBasicLandColor } from '../../utils/cardToColor';

import styles from './TemplatingCardRender.module.scss';
import {
  getArtifactMainframe,
  getBasicLandMainframe,
  getColorMainframe,
  getInnerBorderFrame,
  getLandMainframe,
  getLandOverlay,
  getLowResColorMainframe,
  getRarityIcon
} from './assetLoader';
import {
  injectManaIcons,
  injectMechanics,
  injectName,
  injectPlaneswalkerIcons,
  injectQuotationMarks
} from '../../utils/injectUtils';
import NoCover from '../CardRender/images/no-cover.jpg';
import ImageLoader from '../ImageLoader/ImageLoader';

interface TemplatingCardRenderProps {
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

const TemplatingCardRender = (cardRender: TemplatingCardRenderProps) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText = '', flavourAuthor, cardID } = cardRender;
  const { backFace, collectionNumber, collectionSize } = cardRender;
  const { containerWidth = CARD_WIDTH } = cardRender;

  const { mechanics } = useContext<StoreType>(Store);

  const rarityCode = () => {
    if (rarity === RarityType.Uncommon) return 'U';
    if (rarity === RarityType.Rare) return 'R';
    if (rarity === RarityType.MythicRare) return 'M';
    return 'C';
  };

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  if (cardMainType === CardMainType.BasicLand) {
    const customResizeFactor = (width: number) => {
      return width / 745.0;
    };

    const customGetHeight = (width: number) => {
      return customResizeFactor(width) * 1040.0;
    };

    const mainframe = getBasicLandMainframe(cardSubTypes || BasicLandType.Plains);
    return (
      <div style={{ height: `${customGetHeight(containerWidth)}px` }}>
        <div
          id={`card-id-${cardID}`}
          style={{
            transform: `scaleX(${customResizeFactor(containerWidth)}) scaleY(${customResizeFactor(
              (containerWidth * 1040.0) / CARD_HEIGHT
            )})`,
            transformOrigin: 'top left',
            width: `${(CARD_WIDTH / containerWidth) * 100}%`
          }}
        >
          <div
            style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}
            className={styles.cardRender}
          >
            <ImageLoader src={cover || NoCover} alt="cover" className={styles.basicLandCover} />
            <ImageLoader src={mainframe} className={styles.mainframe} fallBackColor={getBasicLandColor(cardSubTypes || BasicLandType.Plains)} />
            <div className={styles.basicLandTitle}>{cardSubTypes}</div>
          </div>
        </div>
      </div>
    );
  }

  const { color, allColors, orderedCost, hexColor } = getColor(manaCost);
  let mainframe = getColorMainframe(color);
  const lowResMainframe = getLowResColorMainframe(color);
  // @ts-ignore
  if (cardMainType === CardMainType.Artifact || cardMainType === CardMainType.ArtifactCreature) {
    mainframe = getArtifactMainframe();
  }

  let innerBorderFrame = getInnerBorderFrame(allColors);

  let overlay = '';

  if (cardMainType === CardMainType.Land) {
    const identity = getColorIdentity(manaCost, cardText);
    innerBorderFrame = getInnerBorderFrame(identity);
    mainframe = getLandMainframe();
    if (identity.length === 2) overlay = getLandOverlay();
  }

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
          style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}
          className={styles.cardRender}
        >
          <ImageLoader src={cover || NoCover} alt="cover" className={styles.cover} />

          <ImageLoader
            src={mainframe}
            lowResSrc={lowResMainframe}
            className={styles.mainframe}
            fallBackColor={hexColor}
          />
          <img className={styles.innerBorderFrame} src={innerBorderFrame} alt="" />
          <img className={styles.innerBorderFrame} src={overlay} alt="" />

          {cardRender.cardMainType !== CardMainType.Land && !backFace && (
            <div className={styles.cost}>{injectManaIcons(orderedCost, true)}</div>
          )}

          <ImageLoader src={getRarityIcon(rarity)} alt="" className={styles.rarity} />

          <div className={styles.title}>{name}</div>
          <div className={styles.type}>
            {legendary ? 'Legendary ' : ''}
            {cardMainType}
            {cardSubTypes ? ` – ${cardSubTypes}` : ''}
          </div>

          <div className={styles.text}>
            {cardText.map(val => (
              <p>
                {injectQuotationMarks(
                  injectPlaneswalkerIcons(
                    injectManaIcons(injectName(injectMechanics(val, mechanics, name), name))
                  )
                )}
              </p>
            ))}
            <div className={styles.flavour}>
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
          </div>

          <div className={styles.artist}>{creator}</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TemplatingCardRender);
