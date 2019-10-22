import React, { useContext } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '@saeris/react-mana';

import TextResize from 'react-resize-text';

import {
  BasicLandArtStyles,
  BasicLandType,
  CardArtStyles,
  CardMainType,
  ColorType,
  RarityType
} from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor, getColorIdentity } from '../../utils/cardToColor';

import styles from './TemplatingCardRender.module.scss';
import {
  getArtifactMainframe,
  getArtifactPt,
  getColorMainframe,
  getFallbackCover,
  getInnerBorderFrame,
  getLandMainframe,
  getLandOverlay,
  getLowResColorMainframe,
  getPt,
  getRarityIcon
} from './assetLoader';
import { injectForText, injectManaIcons } from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import BasicLandCardRender from './BasicLandCardRender';
import InvocationCardRender from './InvocationCardRender';
import getRarityCode from '../../utils/getRarityCode';
import parseStats from '../../utils/parseStats';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import FlavourText from './FlavourText';
import { getImage } from '../../actions/imageActions';

interface TemplatingCardRenderProps {
  artStyle?: BasicLandArtStyles | CardArtStyles;
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

const TemplatingCardRender = (cardRenderProps: TemplatingCardRenderProps) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRenderProps;
  const { name, manaCost, cardStats, cover, creator } = cardRenderProps;
  const { cardText, flavourText = '', flavourAuthor, cardID } = cardRenderProps;
  const { backFace, collectionNumber, collectionSize } = cardRenderProps;
  const { containerWidth = CARD_WIDTH, artStyle } = cardRenderProps;

  const { mechanics } = useContext<StoreType>(Store);

  const stripCoverValue = (value?: string) => {
    if (!value) return '';
    if (value === 'loading') return '';
    if (value.startsWith('url:')) return value.substring(4);
    if (value.startsWith('base64:')) return value.substring(7);

    return value;
  };

  const parsedCover = stripCoverValue(cover);

  if (cardMainType === CardMainType.BasicLand) {
    let landType: BasicLandType = BasicLandType.Plains;
    if (cardSubTypes && Object.values(BasicLandType).includes(cardSubTypes)) {
      // @ts-ignore
      landType = BasicLandType[cardSubTypes];
    }

    let landArtStyle = BasicLandArtStyles.Regular;
    if (artStyle) {
      Object.keys(BasicLandArtStyles).forEach(key => {
        // @ts-ignore
        if (BasicLandArtStyles[key] === artStyle) {
          // @ts-ignore
          landArtStyle = BasicLandArtStyles[key];
        }
      });
    }

    return (
      <BasicLandCardRender
        artStyle={landArtStyle}
        landType={landType}
        cardID={cardID}
        creator={creator}
        collectionNumber={collectionNumber}
        collectionSize={collectionSize}
        cover={parsedCover}
        containerWidth={containerWidth}
      />
    );
  }

  if (artStyle === CardArtStyles.Invocation) {
    return <InvocationCardRender {...cardRenderProps} cover={parsedCover} />;
  }

  if (cardMainType === CardMainType.Planeswalker) {
    return <PlaneswalkerCardRender {...cardRenderProps} cover={parsedCover} />;
  }

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  const isArtifact =
    cardMainType === CardMainType.Artifact || cardMainType === CardMainType.ArtifactCreature;
  const isCreature =
    cardMainType === CardMainType.Creature || cardMainType === CardMainType.ArtifactCreature;

  const { color, allColors, orderedCost, hexColor } = getColor(manaCost);
  let mainframe = getColorMainframe(color);
  let lowResMainframe = getLowResColorMainframe(color);

  let pt = getPt(color);

  if (isArtifact) {
    mainframe = getArtifactMainframe();
    pt = getArtifactPt(color);
  }

  let innerBorderFrame = getInnerBorderFrame(allColors);

  let overlay = '';

  if (cardMainType === CardMainType.Land) {
    const identity = getColorIdentity(manaCost, cardText);
    innerBorderFrame = getInnerBorderFrame(identity);
    mainframe = getLandMainframe();
    if (identity.length === 2) overlay = getLandOverlay();
  }

  if (color === ColorType.Colorless) {
    overlay = getLandOverlay();
  }

  if (artStyle === CardArtStyles.Borderless) {
    lowResMainframe = '';
    mainframe = '';
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
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`
          }}
          className={`
            ${styles.cardRender} 
            ${artStyle === CardArtStyles.Borderless && styles.borderless}
          `}
        >
          <ImageLoader
            src={parsedCover || getFallbackCover()}
            alt="cover"
            className={`${styles.cover} ${artStyle !== CardArtStyles.Borderless && 'card-cover'}`}
          />

          <ImageLoader
            src={mainframe}
            lowResSrc={lowResMainframe}
            className={styles.mainframe}
            fallBackColor={artStyle !== CardArtStyles.Borderless ? hexColor : undefined}
          />
          <img className={styles.innerBorderFrame} src={innerBorderFrame} alt="" />
          <img className={styles.overlay} src={overlay} alt="" />

          <ImageLoader src={getRarityIcon(rarity)} alt="" className={styles.rarity} />

          {isCreature && (
            <div>
              <img className={styles.overlay} src={pt} alt="" />
              <div className={styles.stats}>
                {`${parseStats(cardStats).power}/${parseStats(cardStats).toughness}`}
              </div>
            </div>
          )}

          {cardRenderProps.cardMainType !== CardMainType.Land && !backFace && (
            <div className={styles.cost}>{injectManaIcons(orderedCost, true)}</div>
          )}

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
                  <p>{injectForText(val, name, mechanics)}</p>
                ))}
                <FlavourText name={name} flavourText={flavourText} flavourAuthor={flavourAuthor} />
              </div>
            </TextResize>
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
          <div className={isCreature ? styles.copyrightStats : styles.copyright}>
            &#8482; &amp; &#169; 2019 BJennWare
          </div>
        </div>
      </div>
    </div>
  );
};

export const NonMemoCardRender = TemplatingCardRender;

export default React.memo(TemplatingCardRender);
