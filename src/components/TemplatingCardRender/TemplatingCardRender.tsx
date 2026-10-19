// may find images here https://github.com/Investigamer/cardconjurer/tree/master/img/frames

import React, { ReactElement, useContext, useLayoutEffect, useRef, useState } from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import { Mana } from '../Mana/Mana';

import TextResize from '../TextResize/TextResize';

import {
  AdventureType,
  BasicLandArtStyles,
  BasicLandType,
  CardArtStyles,
  CardType,
  ColorType,
  CoverFit,
  OmenType,
  PreparedType,
  RarityType,
} from '../../interfaces/enums';
import { Store, StoreType } from '../../store';
import { getColor } from '../../utils/cardToColor';
import { formatTypeLine } from '../../utils/cardTypes';
import CardFaceInterface from '../../interfaces/CardFaceInterface';
import { CARD_HEIGHT, CARD_WIDTH } from '../../utils/constants';

import styles from './TemplatingCardRender.module.scss';
import {
  getAdventureMainframe,
  getAdventurePinline,
  getAdventurePt,
  getAdventureRulesLeft,
  getAdventureRulesRight,
  getBlack,
  getBorderlessMainframe,
  getColorMainframe,
  getCrown,
  getCrownFloatingExtendedArtFix,
  getEldAlternateAdventureMainframe,
  getEldAlternateAdventurePinline,
  getEldAlternateAdventureRulesLeft,
  getExtendedMainframe,
  getFallbackCover,
  getInnerCrown,
  getInventionMainframe,
  getInventionPt,
  getLandMainframe,
  getLandRulesPart,
  getLandTitlePart,
  getLandTypePart,
  getLevelerLevelPart,
  getLevelerPt,
  getLevelerRules,
  getNicknameTitle,
  getOmenMainframe,
  getOmenPinline,
  getOmenRulesLeft,
  getPinline,
  getPrepareMainframe,
  getPreparePinline,
  getPrepareRulesRight,
  getPt,
  getRarityIcon,
  getRulesPart,
  getTitlePart,
  getTokenLandTypePart,
  getTokenMainframe,
  getTypePart,
} from './assetLoader';
import { injectForText, injectManaIcons, isBulletText } from '../../utils/injectUtils';
import { getCoverImageSrc } from '../../utils/cover';
import ImageLoader from '../ImageLoader/ImageLoader';
import getCoverFitClass from './getCoverFitClass';
import BasicLandCardRender from './BasicLandCardRender';
import InvocationCardRender from './InvocationCardRender';
import getRarityCode from '../../utils/getRarityCode';
import parseStats from '../../utils/parseStats';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import FlavourText from './FlavourText';
import getLandColor, { resolveColorIdentity } from '../../utils/getLandColor.ts';

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
  cardTypes: CardType[];
  cardSubTypes?: string;
  basicLandType?: BasicLandType;
  cardText: string[];
  cardStats?: string;
  level1Indicator?: string;
  level2Indicator?: string;
  level1Text?: string[];
  level2Text?: string[];
  level1Stats?: string;
  level2Stats?: string;
  tokenColors?: ColorType[];
  colorIdentity?: ColorType[];
  flavourText?: string;
  // The spell half of an Adventure card (rendered into the left box).
  adventureName?: string;
  adventureCost?: string;
  adventureText?: string[];
  adventureType?: AdventureType;
  // The spell half of an Omen card (rendered into the left box, which shares
  // the adventure frame geometry).
  omenName?: string;
  omenCost?: string;
  omenText?: string[];
  omenType?: OmenType;
  // The spell half of a Prepared card (rendered into the right box — the
  // adventure/omen left-box geometry mirrored across the frame centerline).
  prepareName?: string;
  prepareCost?: string;
  prepareText?: string[];
  prepareType?: PreparedType;
  flavourAuthor?: string;
  cover?: string;
  coverFit?: CoverFit;
  backFace?: boolean;
  collectionNumber: number;
  collectionSize: number;
  containerWidth?: number;
}

const TemplatingCardRender = (cardRenderProps: TemplatingCardRenderProps) => {
  const { legendary, vehicle, nickname, cardTypes, basicLandType, rarity } = cardRenderProps;
  const { name, manaCost, cardStats, cover, creator } = cardRenderProps;
  const { level1Indicator, level2Indicator, level1Text, level2Text, level1Stats, level2Stats } =
    cardRenderProps;
  const { cardText, flavourText = '', flavourAuthor, cardID } = cardRenderProps;
  const { adventureName, adventureCost, adventureText, adventureType } = cardRenderProps;
  const { omenName, omenCost, omenText, omenType } = cardRenderProps;
  const { prepareName, prepareCost, prepareText, prepareType } = cardRenderProps;
  const { backFace, collectionNumber, collectionSize } = cardRenderProps;
  const { containerWidth = CARD_WIDTH, artStyle, coverFit } = cardRenderProps;

  const { mechanics } = useContext<StoreType>(Store);

  // The mana cost (rendered top-right) and the title share the same row, so a
  // wider cost must leave the title less room. Measure the cost box and shrink
  // the title's available width accordingly; TextResize then scales the title
  // text down to fit. Falls back to the CSS width when there is no mana cost.
  const costRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleWidth, setTitleWidth] = useState<number>();

  useLayoutEffect(() => {
    const titleEl = titleRef.current;
    if (!titleEl) return undefined;

    const GAP = 30; // design-space px gap between the title and the mana cost

    const compute = () => {
      const costEl = costRef.current;
      if (!costEl) {
        setTitleWidth(undefined);
        return;
      }
      // Both elements are absolutely positioned inside the unscaled 1500px card
      // frame, so offsetLeft/offsetWidth are in the same design coordinate space
      // regardless of the card's render scale.
      const available = costEl.offsetLeft - titleEl.offsetLeft - GAP;
      setTitleWidth(Math.max(0, available));
    };

    compute();

    const costEl = costRef.current;
    if (!costEl) return undefined;
    // Recompute when the cost box reflows (e.g. once the mana font loads).
    const observer = new ResizeObserver(() => compute());
    observer.observe(costEl);
    return () => observer.disconnect();
  }, [manaCost, backFace, cardTypes]);

  const stripCoverValue = (value?: string) => getCoverImageSrc(value);

  const parsedCover = stripCoverValue(cover);
  const isLand = cardTypes.includes(CardType.Land);
  const isBasicLand = cardTypes.includes(CardType.BasicLand);
  const isPlaneswalker = cardTypes.includes(CardType.Planeswalker);
  const isEnchantment = cardTypes.includes(CardType.Enchantment);
  const isArtifact = cardTypes.includes(CardType.Artifact);
  const isCreature = cardTypes.includes(CardType.Creature);
  const isAdventure = cardTypes.includes(CardType.Adventure);
  const isOmen = cardTypes.includes(CardType.Omen);
  const isPrepared = cardTypes.includes(CardType.Prepared);
  const isEvolution = cardTypes.includes(CardType.Evolution);
  // The Alternate Art art style is an adventure-specific showcase: it swaps
  // every adventure asset (frame, pinline, rules-left, pt) for its alternate
  // variant set.
  const isAlternateArt = isAdventure && artStyle === CardArtStyles.EldAlternateArt;
  const isToken = cardTypes.includes(CardType.Token);
  const isInvention = artStyle === CardArtStyles.Invention;

  if (isBasicLand) {
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

  if (isPlaneswalker) {
    return <PlaneswalkerCardRender {...cardRenderProps} cover={parsedCover} />;
  }

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  const isNickname = nickname != null && nickname.length > 0 && artStyle != CardArtStyles.Invention;

  // Tokens take their colors from the explicit tokenColors selection; a token
  // without a selection is colorless. The mana cost is never used for tokens.
  const tokenFaceColors = isToken ? cardRenderProps.tokenColors : undefined;
  const manaColor = getColor(isToken ? '' : manaCost, tokenFaceColors);
  const textIdentityColors =
    !manaCost && (!isToken || isLand)
      ? resolveColorIdentity(cardText, cardRenderProps.colorIdentity)
      : undefined;
  const textColor = textIdentityColors ? getColor('', textIdentityColors) : undefined;
  let color = textColor?.color ?? manaColor.color;
  const allColors = textColor?.allColors ?? manaColor.allColors;
  const orderedCost = manaColor.orderedCost;
  const hexColor = textColor?.hexColor ?? manaColor.hexColor;
  // The adventure's left rules box belongs to the adventure spell, so its color
  // derives from the adventureCost when set; the pinline (which spans the whole
  // frame), right box, and mainframe keep using the card's own manaCost.
  const adventureColors =
    isAdventure && adventureCost ? getColor(adventureCost).allColors : undefined;
  // The omen's left rules box belongs to the omen spell, so its color derives
  // from the omenCost when set — exactly like the adventure's left box.
  const omenColors = isOmen && omenCost ? getColor(omenCost).allColors : undefined;
  // The prepare's right rules box belongs to the prepare spell, so its color
  // derives from the prepareCost when set — mirroring the adventure/omen left
  // boxes across the centerline. The pinline (which spans the whole frame) and
  // the mainframe keep using the card's own manaCost.
  const prepareColors = isPrepared && prepareCost ? getColor(prepareCost).allColors : undefined;
  let landColors: ColorType[] = [];
  if (isLand) {
    landColors = textColor?.allColors ?? getLandColor(cardText);
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
    isEvolution,
  );
  // The omen / adventure / prepare pinlines belong to the Regular art style;
  // the Extended style carves the generic extended pinlines instead. A missing
  // artStyle counts as Regular, like everywhere else in this component.
  // (Prepared has only the Regular style.)
  const isRegularArtStyle = !artStyle || artStyle === CardArtStyles.Regular;
  const pinline =
    // isEvolution
    // ? getLevelerPinline(allColors)
    // :
    isAlternateArt
      ? getEldAlternateAdventurePinline(isLand ? landColors : allColors)
      : isOmen && isRegularArtStyle
        ? getOmenPinline(isLand ? landColors : allColors)
        : isPrepared && isRegularArtStyle
          ? getPreparePinline(isLand ? landColors : allColors)
          : isAdventure && isRegularArtStyle
            ? getAdventurePinline(isLand ? landColors : allColors)
            : getPinline(isLand ? landColors : allColors, isArtifact, artStyle, isToken);
  const adventureRulesLeft = isAlternateArt
    ? getEldAlternateAdventureRulesLeft(isLand ? landColors : (adventureColors ?? allColors))
    : isAdventure
      ? getAdventureRulesLeft(isLand ? landColors : (adventureColors ?? allColors))
      : '';
  const omenRulesLeft = isOmen
    ? getOmenRulesLeft(isLand ? landColors : (omenColors ?? allColors))
    : '';
  // The prepare's right rules box mirrors the adventure/omen left boxes across
  // the centerline; its color follows the prepareCost, like theirs.
  const prepareRulesRight = isPrepared
    ? getPrepareRulesRight(isLand ? landColors : (prepareColors ?? allColors))
    : '';
  const adventureRulesRight =
    isAdventure && (artStyle === CardArtStyles.Extended || artStyle === CardArtStyles.Borderless)
      ? getAdventureRulesRight(isLand ? landColors : allColors)
      : '';
  let titlePart = isLand
    ? getLandTitlePart(landColors)
    : getTitlePart(allColors, isArtifact, isToken);
  let typePart = isLand
    ? isToken
      ? getTokenLandTypePart()
      : getLandTypePart(landColors)
    : getTypePart(allColors, isArtifact, isToken);
  let rulesPart = isEvolution
    ? getLevelerRules(allColors)
    : isLand
      ? isToken
        ? getRulesPart(landColors, isArtifact, true)
        : getLandRulesPart(landColors)
      : getRulesPart(allColors, isArtifact, isToken);
  if (isAdventure || isOmen || isPrepared || isEvolution) {
    rulesPart = '';
  }

  // if (isEvolution) {
  //   mainframe = getColorMainframe(color, isEnchantment, isArtifact, vehicle);
  //   titlePart = '';
  //   typePart = '';
  // } else
  if (isAlternateArt) {
    mainframe = getEldAlternateAdventureMainframe(color);
    pt = getAdventurePt(color);
  } else if (artStyle === CardArtStyles.Extended) {
    mainframe = getExtendedMainframe(color, isLand, isArtifact, vehicle, isEnchantment);
    typePart = '';
  } else if (artStyle === CardArtStyles.Borderless) {
    mainframe = getBorderlessMainframe(color, isLand, isArtifact, isNickname);
    titlePart = '';
    typePart = '';
    rulesPart = '';
  } else if (isInvention) {
    mainframe = getInventionMainframe(color, isArtifact);
    pt = getInventionPt();
  } else if (isToken) {
    mainframe = getTokenMainframe(color, isArtifact, isLand);
  } else if (isLand) {
    mainframe = getLandMainframe(color, artStyle);
  } else if (isAdventure) {
    mainframe = getAdventureMainframe(color, isEnchantment);
  } else if (isOmen) {
    mainframe = getOmenMainframe(color, isEnchantment);
  } else if (isPrepared) {
    mainframe = getPrepareMainframe(color, isEnchantment);
  } else {
    mainframe = getColorMainframe(color, isEnchantment, isArtifact, vehicle);
  }

  const black = getBlack();
  let crownBlack: ReactElement | null = null;
  let crownExtendedArtFix: ReactElement | null = null;
  let crown: ReactElement | null = null;
  let crown2: ReactElement | null = null;
  let crownInner: ReactElement | null = null;
  // The Alternate Art adventure style shows no crown at all: no regular
  // crown, no Nyx inner crown and no crown backing plate.
  if (legendary && !isInvention && !isAlternateArt) {
    const isFullArt =
      artStyle == CardArtStyles.Borderless || artStyle == CardArtStyles.Extended || isToken;
    const crownImagePath = getCrown(
      color,
      isFullArt,
      isLand,
      isArtifact,
      isNickname,
      isLand ? landColors : allColors,
    );
    crown = (
      <ImageLoader
        src={typeof crownImagePath === 'string' ? crownImagePath : crownImagePath.highRes}
        lowResSrc={typeof crownImagePath === 'string' ? undefined : crownImagePath.lowRes}
        className={isFullArt || isNickname ? styles.crownFloating : styles.crown}
      />
    );

    if (isNickname && !isFullArt) {
      const crownImagePath2 = getCrown(
        color,
        false,
        isLand,
        isArtifact,
        false,
        isLand ? landColors : allColors,
      );
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

  const hasStats: boolean = isCreature || (isArtifact && !!vehicle);

  const levelerLevelMid =
    isEvolution && level1Indicator ? getLevelerLevelPart('mid', allColors, isEnchantment) : null;
  const levelerLevelBottom =
    isEvolution && level2Indicator ? getLevelerLevelPart('bottom', allColors, isEnchantment) : null;

  const hasSecondEvolution: boolean =
    isEvolution &&
    (!!level2Indicator || (!!level2Text && level2Text.length > 0 && level2Text[0] !== ''));

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
            ${artStyle === CardArtStyles.EldAlternateArt && styles.eldAlternateArt}
            ${color === ColorType.Gold && styles.gold}
            ${isToken && styles.token}
            ${isInvention && styles.invention}
            ${isNickname && styles.nicknameFrame}
            ${isEnchantment && styles.enchantment}
            ${isEvolution && styles.evolution}
            ${!hasSecondEvolution && styles.hasNoSecondEvolution}
            ${isLand && styles.land}
            ${isArtifact && styles.artifact}
            ${artStyle === CardArtStyles.Extended && styles.extended}
            ${color === ColorType.Colorless && styles.colorless}
            ${hasStats && styles.hasStats}
          `}
        >
          <ImageLoader
            src={parsedCover || getFallbackCover()}
            alt="cover"
            className={`${styles.cover} ${getCoverFitClass(styles, coverFit)} card-cover`}
          />

          <ImageLoader
            src={typeof mainframe === 'string' ? mainframe : mainframe.highRes}
            lowResSrc={typeof mainframe === 'string' ? undefined : mainframe.lowRes}
            className={`${styles.mainframe} ${
              isToken ? styles.tokenMainframe : isInvention ? styles.inventionMainframe : ''
            }`}
            fallBackColor={artStyle !== CardArtStyles.Borderless ? hexColor : undefined}
          />

          {titlePart ? <img className={styles.titlePart} src={titlePart} alt="" /> : null}
          {typePart ? <img className={styles.typePart} src={typePart} alt="" /> : null}
          {rulesPart ? <img className={styles.rulesPart} src={rulesPart} alt="" /> : null}

          {pinline ? <img className={styles.pinline} src={pinline} alt="" /> : null}

          {adventureRulesLeft ? (
            <img className={styles.adventureRulesLeft} src={adventureRulesLeft} alt="" />
          ) : null}
          {omenRulesLeft ? (
            <img className={styles.omenRulesLeft} src={omenRulesLeft} alt="" />
          ) : null}
          {prepareRulesRight ? (
            <img className={styles.prepareRulesRight} src={prepareRulesRight} alt="" />
          ) : null}
          {adventureRulesRight ? (
            <img className={styles.adventureRulesRight} src={adventureRulesRight} alt="" />
          ) : null}

          {/* The adventure spell renders into the frame's left box (see the
              SCSS for the measured coordinates); each part only appears when
              its data is set. */}
          {isAdventure && adventureName ? (
            <div className={styles.adventureName}>{adventureName}</div>
          ) : null}
          {isAdventure && adventureCost ? (
            <div className={styles.adventureCost}>
              {injectManaIcons(getColor(adventureCost).orderedCost, true)}
            </div>
          ) : null}
          {isAdventure && adventureType ? (
            <div className={styles.adventureTypeLine}>{`${adventureType} – Adventure`}</div>
          ) : null}
          {isAdventure && adventureText && adventureText.length > 0 ? (
            <div className={styles.adventureText}>
              <TextResize
                defaultFontSize={42}
                maxFontSize={50}
                minFontSize={28}
                lineHeight={1.1}
                className={styles.textWrap}
              >
                <div>
                  {adventureText.map((val, i) => (
                    <p
                      key={`adventure-text-${cardID}-${i}`}
                      className={isBulletText(val) ? styles.bulletText : undefined}
                      style={val.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined}
                    >
                      {injectForText(val, name, mechanics)}
                    </p>
                  ))}
                </div>
              </TextResize>
            </div>
          ) : null}

          {/* The omen spell renders into the frame's left box. The omen frame
              shares the adventure frame geometry (their measured rules-left
              masks align), so the adventure SCSS classes are reused for the
              box positions; each part only appears when its data is set. */}
          {isOmen && omenName ? <div className={styles.omenName}>{omenName}</div> : null}
          {isOmen && omenCost ? (
            <div className={styles.omenCost}>
              {injectManaIcons(getColor(omenCost).orderedCost, true)}
            </div>
          ) : null}
          {isOmen && omenType ? (
            <div className={styles.omenTypeLine}>{`${omenType} – Omen`}</div>
          ) : null}
          {isOmen && omenText && omenText.length > 0 ? (
            <div className={styles.omenText}>
              <TextResize
                defaultFontSize={42}
                maxFontSize={50}
                minFontSize={28}
                lineHeight={1.1}
                className={styles.textWrap}
              >
                <div>
                  {omenText.map((val, i) => (
                    <p
                      key={`omen-text-${cardID}-${i}`}
                      className={isBulletText(val) ? styles.bulletText : undefined}
                      style={val.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined}
                    >
                      {injectForText(val, name, mechanics)}
                    </p>
                  ))}
                </div>
              </TextResize>
            </div>
          ) : null}

          {/* The prepare spell renders into the frame's RIGHT box: the prepare
              frame geometry is the adventure/omen left-box geometry mirrored
              across the centerline, so it needs its own SCSS classes (the
              adventure/omen classes position the left box); each part only
              appears when its data is set. The type line renders the plain
              prepareType — no "– Prepared" suffix (user decision). */}
          {isPrepared && prepareName ? (
            <div className={styles.prepareName}>{prepareName}</div>
          ) : null}
          {isPrepared && prepareCost ? (
            <div className={styles.prepareCost}>
              {injectManaIcons(getColor(prepareCost).orderedCost, true)}
            </div>
          ) : null}
          {isPrepared && prepareType ? (
            <div className={styles.prepareTypeLine}>{`${prepareType}`}</div>
          ) : null}
          {isPrepared && prepareText && prepareText.length > 0 ? (
            <div className={styles.prepareText}>
              <TextResize
                defaultFontSize={42}
                maxFontSize={50}
                minFontSize={28}
                lineHeight={1.1}
                className={styles.textWrap}
              >
                <div>
                  {prepareText.map((val, i) => (
                    <p
                      key={`prepare-text-${cardID}-${i}`}
                      className={isBulletText(val) ? styles.bulletText : undefined}
                      style={val.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined}
                    >
                      {injectForText(val, name, mechanics)}
                    </p>
                  ))}
                </div>
              </TextResize>
            </div>
          ) : null}

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

          <ImageLoader
            src={getRarityIcon(rarity)}
            alt=""
            className={`${styles.rarity} ${isToken ? styles.tokenRarity : ''}`}
          />

          {(isCreature || (isArtifact && vehicle)) && (
            <div>
              {pt ? (
                <img
                  className={`${styles.pt} ${isEvolution ? `${styles.levelerPt} ${styles.levelerPtTop}` : ''}`}
                  src={pt}
                  alt=""
                />
              ) : null}
              <div className={`${styles.stats} ${isEvolution ? styles.levelerStatsTop : ''}`}>
                {`${parseStats(cardStats).power}/${parseStats(cardStats).toughness}`}
              </div>
            </div>
          )}

          {isEvolution ? (
            <>
              {level1Text?.length ? (
                <div className={`${styles.text} ${styles.levelerText} ${styles.levelerLevel1Text}`}>
                  <div className={styles.levelerLevel1TextBackground}></div>
                  <TextResize
                    defaultFontSize={42}
                    maxFontSize={56}
                    minFontSize={38}
                    lineHeight={1.1}
                    className={styles.textWrap}
                  >
                    <div>
                      {level1Text.map((val, i) => (
                        <p
                          key={`level-1-text-${cardID}-${i}`}
                          className={isBulletText(val) ? styles.bulletText : undefined}
                          style={
                            val.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined
                          }
                        >
                          {injectForText(val, name, mechanics)}
                        </p>
                      ))}
                    </div>
                  </TextResize>
                </div>
              ) : null}
              {levelerLevelMid ? (
                <ImageLoader src={levelerLevelMid} className={styles.levelerLevelMid} />
              ) : null}
              {level1Indicator ? (
                <div className={`${styles.levelerIndicator} ${styles.levelerIndicatorMid}`}>
                  {level1Indicator}
                </div>
              ) : null}
              {hasStats && (
                <>
                  <img
                    className={`${styles.pt} ${styles.levelerPt} ${styles.levelerPtMid}`}
                    src={getLevelerPt(color, isArtifact, vehicle, 'mid')}
                    alt=""
                  />
                  <div className={`${styles.stats} ${styles.levelerStatsMid}`}>
                    {`${parseStats(level1Stats).power}/${parseStats(level1Stats).toughness}`}
                  </div>
                </>
              )}
              {hasSecondEvolution && (
                <>
                  {level2Text?.length ? (
                    <div
                      className={`${styles.text} ${styles.levelerText} ${styles.levelerLevel2Text}`}
                    >
                      <div className={styles.levelerLevel2TextBackground}></div>
                      <TextResize
                        defaultFontSize={42}
                        maxFontSize={56}
                        minFontSize={38}
                        lineHeight={1.1}
                        className={styles.textWrap}
                      >
                        <div>
                          {level2Text.map((val, i) => (
                            <p
                              key={`level-2-text-${cardID}-${i}`}
                              className={isBulletText(val) ? styles.bulletText : undefined}
                              style={
                                val.trimStart().startsWith('--')
                                  ? { marginLeft: '0.5em' }
                                  : undefined
                              }
                            >
                              {injectForText(val, name, mechanics)}
                            </p>
                          ))}
                        </div>
                      </TextResize>
                    </div>
                  ) : null}
                  {levelerLevelBottom ? (
                    <ImageLoader src={levelerLevelBottom} className={styles.levelerLevelBottom} />
                  ) : null}
                  {level2Indicator ? (
                    <div className={`${styles.levelerIndicator} ${styles.levelerIndicatorBottom}`}>
                      {level2Indicator}
                    </div>
                  ) : null}
                  {hasStats && (
                    <>
                      <img
                        className={`${styles.pt} ${styles.levelerPt} ${styles.levelerPtBottom}`}
                        src={getLevelerPt(color, isArtifact, vehicle, 'bottom')}
                        alt=""
                      />
                      <div className={`${styles.stats} ${styles.levelerStatsBottom}`}>
                        {`${parseStats(level2Stats).power}/${parseStats(level2Stats).toughness}`}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : null}

          {!isLand && !isToken && !backFace && (
            <div ref={costRef} className={`${styles.cost} ${isToken ? styles.tokenCost : ''}`}>
              {injectManaIcons(orderedCost, true)}
            </div>
          )}

          <div
            ref={titleRef}
            className={`${styles.title} ${isToken ? styles.tokenTitle : ''}`}
            style={titleWidth !== undefined ? { width: `${titleWidth}px` } : undefined}
          >
            <TextResize defaultFontSize={75} maxFontSize={75} minFontSize={40}>
              {name}
            </TextResize>
          </div>
          {isNickname && <div className={styles.nicknameText}>{nickname}</div>}
          <div className={`${styles.type} ${isToken ? styles.tokenType : ''}`}>
            <TextResize defaultFontSize={67} maxFontSize={67} minFontSize={38}>
              {formatTypeLine(cardRenderProps as unknown as CardFaceInterface)}
            </TextResize>
          </div>

          <div
            className={`${styles.text} ${isToken ? styles.tokenText : ''} ${
              isAdventure ? styles.adventureRightText : ''
            } ${isOmen ? styles.omenRightText : ''} ${isPrepared ? styles.prepareLeftText : ''} ${
              isEvolution ? styles.levelerText : ''
            }`}
          >
            <TextResize
              defaultFontSize={42}
              maxFontSize={isAdventure || isOmen || isPrepared ? 50 : 56}
              minFontSize={38}
              lineHeight={1.1}
              className={styles.textWrap}
            >
              <div>
                {cardText.map((val, i) => (
                  <p
                    key={`card-text-${cardID}-${i}`}
                    className={isBulletText(val) ? styles.bulletText : undefined}
                    style={val.trimStart().startsWith('--') ? { marginLeft: '0.5em' } : undefined}
                  >
                    {injectForText(val, name, mechanics)}
                  </p>
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
          <div
            className={
              isCreature || (isArtifact && vehicle) || isEvolution
                ? styles.copyrightStats
                : styles.copyright
            }
          >
            &#8482; &amp; &#169; 2019 BJennWare
          </div>
        </div>
      </div>
    </div>
  );
};

export const NonMemoCardRender = TemplatingCardRender;

export default React.memo(TemplatingCardRender);
