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
import {
  injectManaIcons,
  injectMechanics,
  injectName,
  injectPlaneswalkerIcons,
  injectQuotationMarks
} from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import BasicLandCardRender from './BasicLandCardRender';
import InvocationCardRender from './InvocationCardRender';

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
        cover={cover}
        containerWidth={containerWidth}
      />
    );
  }

  if (artStyle === CardArtStyles.Invocation) {
    return <InvocationCardRender {...cardRenderProps} />;
  }

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

  if (artStyle === CardArtStyles.Borderless && color === ColorType.Colorless) {
    overlay = getLandOverlay();
  }

  const parseCollectionNumber = (n: number): string => {
    const res = n.toString(10);
    if (res.length === 0) return '000';
    if (res.length === 1) return `00${res}`;
    if (res.length === 2) return `0${res}`;
    return res;
  };

  if (artStyle === CardArtStyles.Borderless) {
    lowResMainframe = '';
    mainframe = '';
  }

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
          <ImageLoader src={cover || getFallbackCover()} alt="cover" className={styles.cover} />

          <ImageLoader
            src={mainframe}
            lowResSrc={lowResMainframe}
            className={styles.mainframe}
            fallBackColor={artStyle !== CardArtStyles.Borderless ? hexColor : undefined}
          />
          <img className={styles.innerBorderFrame} src={innerBorderFrame} alt="" />
          <img className={styles.overlay} src={overlay} alt="" />

          {cardRenderProps.cardMainType !== CardMainType.Land && !backFace && (
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
                      injectPlaneswalkerIcons(
                        injectManaIcons(injectName(injectMechanics(val, mechanics, name), name))
                      )
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
                {`${parseStats().power}/${parseStats().toughness}`}
              </div>
            </div>
          )}

          <div className={styles.collectionBlock}>
            {`${parseCollectionNumber(collectionNumber)}/${parseCollectionNumber(collectionSize)}`}
            {` ${rarityCode()}`}
          </div>
          <div className={styles.collectionBlock2}>
            MFS &#x2022; EN
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={isCreature ? styles.copyrightStats : styles.copyright}>
            &#8482; &amp; &#169; 2019 Wizards of the Coast
          </div>
        </div>
      </div>
    </div>
  );
};

export const NonMemoCardRender = TemplatingCardRender;

export default React.memo(TemplatingCardRender);
