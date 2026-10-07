// may find images here https://github.com/Investigamer/cardconjurer/tree/master/img/frames

import React, { ReactElement, useContext } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '../Mana/Mana';

import TextResize from '../TextResize/TextResize';

import {
  BasicLandArtStyles,
  BasicLandType,
  CardArtStyles,
  CardMainType,
  ColorType,
  CoverFit,
  RarityType,
} from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor } from '../../utils/cardToColor';
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/constants';

import styles from './TemplatingCardRender.module.scss';
import {
  getBlack,
  getBorderlessMainframe,
  getColorMainframe,
  getCrown,
  getCrownFloatingExtendedArtFix,
  getExtendedMainframe,
  getFallbackCover,
  getInnerCrown,
  getInventionMainframe,
  getInventionPt,
  getLandMainframe,
  getLandRulesPart,
  getLandTitlePart,
  getLandTypePart,
  getNicknameTitle,
  getPinline,
  getRulesPart,
  getTitlePart,
  getTypePart,
  getPt,
  getRarityIcon,
  getTokenMainframe,
} from './assetLoader';
import { injectForText, injectManaIcons } from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import getCoverFitClass from './getCoverFitClass';
import BasicLandCardRender from './BasicLandCardRender';
import InvocationCardRender from './InvocationCardRender';
import getRarityCode from '../../utils/getRarityCode';
import parseStats from '../../utils/parseStats';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import FlavourText from './FlavourText';
import getLandColor from '../../utils/getLandColor.ts';

interface TemplatingCardRenderProps {
  artStyle?: BasicLandArtStyles | CardArtStyles;
  name: string;
  rarity: RarityType;
  creator?: string;
  cardID: string;
  manaCost: string;
  legendary?: boolean;
  vehicle?: boolean;
  nickname?: string;
  cardMainType: CardMainType;
  cardSubTypes?: string;
  basicLandType?: BasicLandType;
  cardText: string[];
  cardStats?: string;
  flavourText?: string;
  flavourAuthor?: string;
  cover?: string;
  coverFit?: CoverFit;
  backFace?: boolean;
  collectionNumber: number;
  collectionSize: number;
  containerWidth?: number;
}

const TemplatingCardRender = (cardRenderProps: TemplatingCardRenderProps) => {
  const { legendary, vehicle, nickname, cardMainType, cardSubTypes, basicLandType, rarity } =
    cardRenderProps;
  const { name, manaCost, cardStats, cover, creator } = cardRenderProps;
  const { cardText, flavourText = '', flavourAuthor, cardID } = cardRenderProps;
  const { backFace, collectionNumber, collectionSize } = cardRenderProps;
  const { containerWidth = CARD_WIDTH, artStyle, coverFit } = cardRenderProps;

  const { mechanics } = useContext<StoreType>(Store);

  const stripCoverValue = (value?: string) => {
    if (!value) return '';
    if (value === 'loading') return '';
    if (value.startsWith('url:')) return value.substring(4);
    if (value.startsWith('base64:')) return value.substring(7);

    return value;
  };

  const parsedCover = stripCoverValue(cover);
  const isLand = cardMainType === CardMainType.Land || cardMainType === CardMainType.BasicLand;

  if (cardMainType === CardMainType.BasicLand) {
    let landType: BasicLandType = BasicLandType.Plains;
    if (basicLandType && (Object.values(BasicLandType) as string[]).includes(basicLandType)) {
      landType = basicLandType;
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
        coverFit={coverFit}
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

  const isNickname = nickname != null && nickname.length > 0 && artStyle != CardArtStyles.Invention;
  const isEnchantment =
    cardMainType === CardMainType.Enchantment || cardMainType === CardMainType.EnchantmentCreature;
  const isArtifact =
    cardMainType === CardMainType.Artifact || cardMainType === CardMainType.ArtifactCreature;
  const isCreature =
    cardMainType === CardMainType.Creature ||
    cardMainType === CardMainType.ArtifactCreature ||
    cardMainType === CardMainType.CreatureToken ||
    cardMainType === CardMainType.EnchantmentCreature;
  const isToken =
    cardMainType === CardMainType.CreatureToken || cardMainType === CardMainType.ArtifactToken;
  const isInvention = artStyle === CardArtStyles.Invention;

  let { color } = getColor(manaCost);
  const { allColors, orderedCost, hexColor } = getColor(manaCost);
  let landColors: ColorType[] = [];
  if (isLand) {
    landColors = getLandColor(cardText);
    if (landColors.length === 0) {
      color = ColorType.Colorless;
    } else if (landColors.length === 1) {
      color = landColors[0];
    } else {
      color = ColorType.Gold;
    }
  }
  let mainframe;
  let pt = getPt(
    color,
    isArtifact,
    vehicle,
    isNickname,
    artStyle === CardArtStyles.Borderless,
    isLand,
  );
  const pinline = getPinline(isLand ? landColors : allColors, isArtifact, artStyle);
  let titlePart = isLand ? getLandTitlePart(landColors) : getTitlePart(allColors, isArtifact);
  let typePart = isLand ? getLandTypePart(landColors) : getTypePart(allColors, isArtifact);
  let rulesPart = isLand ? getLandRulesPart(landColors) : getRulesPart(allColors, isArtifact);
  if (artStyle === CardArtStyles.Borderless) {
    titlePart = '';
    typePart = '';
    rulesPart = '';
  }

  if (artStyle === CardArtStyles.Extended) {
    mainframe = getExtendedMainframe(color, isLand, isArtifact, vehicle, isEnchantment);
  } else if (artStyle === CardArtStyles.Borderless) {
    mainframe = getBorderlessMainframe(color, isLand, isArtifact, isNickname);
  } else if (isInvention) {
    mainframe = getInventionMainframe(color, isArtifact);
    pt = getInventionPt();
  } else if (isToken) {
    mainframe = getTokenMainframe(color, isArtifact);
  } else if (isLand) {
    mainframe = getLandMainframe(color, artStyle);
  } else {
    mainframe = getColorMainframe(color, isEnchantment, isArtifact, vehicle);
  }

  const black = getBlack();
  let crownBlack: ReactElement | null = null;
  let crownExtendedArtFix: ReactElement | null = null;
  let crown: ReactElement | null = null;
  let crown2: ReactElement | null = null;
  let crownInner: ReactElement | null = null;
  if (legendary && !isInvention) {
    const isFullArt = artStyle == CardArtStyles.Borderless || artStyle == CardArtStyles.Extended;
    const crownImagePath = getCrown(color, isFullArt, isLand, isArtifact, isNickname);
    crown = (
      <ImageLoader
        src={typeof crownImagePath === 'string' ? crownImagePath : crownImagePath.highRes}
        lowResSrc={typeof crownImagePath === 'string' ? undefined : crownImagePath.lowRes}
        className={isFullArt || isNickname ? styles.crownFloating : styles.crown}
      />
    );

    if (isNickname && !isFullArt) {
      const crownImagePath2 = getCrown(color, false, isLand, isArtifact, false);
      crown2 = (
        <ImageLoader
          src={typeof crownImagePath2 === 'string' ? crownImagePath2 : crownImagePath2.highRes}
          lowResSrc={typeof crownImagePath2 === 'string' ? undefined : crownImagePath2.lowRes}
          className={styles.crown}
        />
      );
    }

    if (artStyle == CardArtStyles.Extended) {
      crownExtendedArtFix = (
        <ImageLoader
          src={getCrownFloatingExtendedArtFix()}
          className={styles.crownExtendedArtFix}
        />
      );
    }
    if (artStyle != CardArtStyles.Borderless) {
      crownBlack = <ImageLoader src={black} className={styles.crownBlack} />;
    }
    if (isEnchantment) {
      crownInner = (
        <ImageLoader src={getInnerCrown(color, isArtifact)} className={styles.crownInner} />
      );
    }
  }

  return (
    <div style={{ height: `${getHeight(containerWidth)}px` }}>
      <div
        id={`card-id-${cardID}`}
        style={{
          transform: `scale(${resizeFactor(containerWidth)})`,
          transformOrigin: 'top left',
          width: `${(CARD_WIDTH / containerWidth) * 100}%`,
        }}
      >
        <div
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
          }}
          className={`
            ${styles.cardRender} 
            ${artStyle === CardArtStyles.Borderless && styles.borderless}
            ${isToken && styles.token}
            ${isInvention && styles.invention}
            ${isNickname && styles.nicknameFrame}
            ${isEnchantment && styles.enchantment}
            ${isLand && styles.land}
            ${artStyle === CardArtStyles.Extended && styles.extended}
            ${color === ColorType.Colorless && styles.colorless}
          `}
        >
          <ImageLoader
            src={parsedCover || getFallbackCover()}
            alt="cover"
            className={`${styles.cover} ${getCoverFitClass(styles, coverFit)} ${
              artStyle !== CardArtStyles.Borderless && 'card-cover'
            }`}
          />

          <ImageLoader
            src={typeof mainframe === 'string' ? mainframe : mainframe.highRes}
            lowResSrc={typeof mainframe === 'string' ? undefined : mainframe.lowRes}
            className={`${styles.mainframe} ${
              isToken ? styles.tokenMainframe : isInvention ? styles.inventionMainframe : ''
            }`}
            fallBackColor={artStyle !== CardArtStyles.Borderless ? hexColor : undefined}
          />

          {pinline ? <img className={styles.pinline} src={pinline} alt="" /> : null}
          {isNickname && !crown && (
            <ImageLoader
              src={getNicknameTitle(color, isArtifact, isLand, isLand ? landColors : allColors)}
              className={styles.nickname}
            />
          )}
          {crownBlack}
          {crownExtendedArtFix}
          {crown2}
          {crown}
          {crownInner}

          {/*{!isToken && !isInvention && innerBorderFrame ? <img className={styles.innerBorderFrame} src={innerBorderFrame} alt="" /> : null}*/}
          {/*{overlay ? <img className={styles.overlay} src={overlay} alt="" /> : null}*/}

          {titlePart ? <img className={styles.titlePart} src={titlePart} alt="" /> : null}
          {typePart ? <img className={styles.typePart} src={typePart} alt="" /> : null}
          {rulesPart ? <img className={styles.rulesPart} src={rulesPart} alt="" /> : null}

          <ImageLoader
            src={getRarityIcon(rarity)}
            alt=""
            className={`${styles.rarity} ${isToken ? styles.tokenRarity : ''}`}
          />

          {isCreature && (
            <div>
              {pt ? <img className={styles.pt} src={pt} alt="" /> : null}
              <div className={styles.stats}>
                {`${parseStats(cardStats).power}/${parseStats(cardStats).toughness}`}
              </div>
            </div>
          )}

          {cardRenderProps.cardMainType !== CardMainType.Land && !isToken && !backFace && (
            <div className={`${styles.cost} ${isToken ? styles.tokenCost : ''}`}>
              {injectManaIcons(orderedCost, true)}
            </div>
          )}

          <div className={`${styles.title} ${isToken ? styles.tokenTitle : ''}`}>{name}</div>
          {isNickname && <div className={styles.nicknameText}>{nickname}</div>}
          <div className={`${styles.type} ${isToken ? styles.tokenType : ''}`}>
            {legendary ? 'Legendary ' : ''}
            {cardMainType}
            {[vehicle && isArtifact ? 'Vehicle' : '', cardSubTypes].filter(Boolean).join(' ')
              ? ` – ${[vehicle && isArtifact ? 'Vehicle' : '', cardSubTypes].filter(Boolean).join(' ')}`
              : ''}
          </div>

          <div className={`${styles.text} ${isToken ? styles.tokenText : ''}`}>
            <TextResize
              defaultFontSize={42}
              maxFontSize={56}
              minFontSize={38}
              className={styles.textWrap}
            >
              <div>
                {cardText.map((val, i) => (
                  <p key={`card-text-${cardID}-${i}`}>{injectForText(val, name, mechanics)}</p>
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
