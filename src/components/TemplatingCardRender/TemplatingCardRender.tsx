// may find images here https://github.com/Investigamer/cardconjurer/tree/master/img/frames

import React, {ReactElement, useContext} from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import {Mana} from '../Mana/Mana';

import TextResize from '../TextResize/TextResize';

import {
    BasicLandArtStyles,
    BasicLandType,
    CardArtStyles,
    CardMainType,
    ColorType,
    RarityType,
} from '../../interfaces/enums';
import {Store, StoreType} from '../../store';
import {getColor} from '../../utils/cardToColor';
import getLandColor from '../../utils/getLandColor';
import {CARD_WIDTH, CARD_HEIGHT} from '../../utils/constants';

import styles from './TemplatingCardRender.module.scss';
import {
    getColorMainframe,
    getCrown,
    getBlack,
    getFallbackCover,
    getInnerBorderFrame,
    getInventionMainframe,
    getInventionPt,
    getLandMainframe,
    getLandOverlay,
    getLowResColorMainframe,
    getPt,
    getRarityIcon,
    getTokenMainframe, getInnerCrown, getNicknameTitle, getBoxTopperMainframe,
} from './assetLoader';
import {injectForText, injectManaIcons} from '../../utils/injectUtils';
import ImageLoader from '../ImageLoader/ImageLoader';
import BasicLandCardRender from './BasicLandCardRender';
import InvocationCardRender from './InvocationCardRender';
import getRarityCode from '../../utils/getRarityCode';
import parseStats from '../../utils/parseStats';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import PlaneswalkerCardRender from './PlaneswalkerCardRender';
import FlavourText from './FlavourText';

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

const TemplatingCardRender = (cardRenderProps: TemplatingCardRenderProps) => {
    const {legendary, vehicle, nickname, cardMainType, cardSubTypes, rarity} = cardRenderProps;
    const {name, manaCost, cardStats, cover, creator} = cardRenderProps;
    const {cardText, flavourText = '', flavourAuthor, cardID} = cardRenderProps;
    const {backFace, collectionNumber, collectionSize} = cardRenderProps;
    const {containerWidth = CARD_WIDTH, artStyle} = cardRenderProps;

    const {mechanics} = useContext<StoreType>(Store);

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
        if (cardSubTypes && (Object.values(BasicLandType) as string[]).includes(cardSubTypes)) {
            // @ts-ignore
            landType = BasicLandType[cardSubTypes];
        }

        let landArtStyle = BasicLandArtStyles.Regular;
        if (artStyle) {
            Object.keys(BasicLandArtStyles).forEach((key) => {
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
        return <InvocationCardRender {...cardRenderProps} cover={parsedCover}/>;
    }

    if (cardMainType === CardMainType.Planeswalker) {
        return <PlaneswalkerCardRender {...cardRenderProps} cover={parsedCover}/>;
    }

    const resizeFactor = (width: number) => {
        return width / CARD_WIDTH;
    };

    const getHeight = (width: number) => {
        return resizeFactor(width) * CARD_HEIGHT;
    };

    const isNickname = nickname != null && nickname.length > 0;
    const isEnchantment = cardMainType === CardMainType.Enchantment;
    const isArtifact =
        cardMainType === CardMainType.Artifact || cardMainType === CardMainType.ArtifactCreature;
    const isCreature =
        cardMainType === CardMainType.Creature ||
        cardMainType === CardMainType.ArtifactCreature ||
        cardMainType === CardMainType.CreatureToken;
    const isToken =
        cardMainType === CardMainType.CreatureToken || cardMainType === CardMainType.ArtifactToken;
    const isInvention =
        artStyle === CardArtStyles.Invention;

    const {color, allColors, orderedCost, hexColor} = getColor(manaCost);
    let mainframe
    if (artStyle === CardArtStyles.Extended) {
        mainframe = getBoxTopperMainframe(color, isLand, isArtifact, vehicle);
    } else {
        mainframe = getColorMainframe(color, isEnchantment, isArtifact, vehicle);
    }
    let lowResMainframe = getLowResColorMainframe(color, isArtifact);

    let pt = getPt(color, isArtifact, isNickname);

    let innerBorderFrame = getInnerBorderFrame(allColors);

    let overlay = '';

    if (cardMainType === CardMainType.Land) {
        const identity = getLandColor(manaCost, cardText);
        innerBorderFrame = getInnerBorderFrame(identity);
        // mainframe = getLandMainframe();
        if (identity.length === 2) overlay = getLandOverlay();
    }

    if (color === ColorType.Colorless) {
        overlay = getLandOverlay();
    }

    if (isInvention) {
        mainframe = getInventionMainframe(color, isArtifact);
        lowResMainframe = '';
        pt = getInventionPt();
        overlay = ''
    }

    if (isToken) {
        mainframe = getTokenMainframe(color, isArtifact);
        lowResMainframe = '';
        overlay = ''
    }

    if (artStyle === CardArtStyles.Borderless) {
        lowResMainframe = '';
        mainframe = '';
    }

    let black = getBlack();
    let crownBlack: ReactElement | null = null;
    let crown: ReactElement | null = null;
    let crownInner: ReactElement | null = null;
    if (legendary) {
        const crownImagePath = getCrown(
            color,
            artStyle == CardArtStyles.Borderless || artStyle == CardArtStyles.Extended,
            isLand,
            isArtifact,
        );
        crown = <ImageLoader
            src={crownImagePath}
            className={artStyle == CardArtStyles.Borderless || artStyle == CardArtStyles.Extended ? styles.crownFloating : styles.crown}
        />
        if (artStyle != CardArtStyles.Borderless) {
            crownBlack = <ImageLoader
                src={black}
                className={styles.crownBlack}
            />
        }
        if (isEnchantment) {
            crownInner = <ImageLoader
                src={getInnerCrown(color, isArtifact)}
                className={styles.crownInner}
            />
        }
    }

    return (
        <div style={{height: `${getHeight(containerWidth)}px`}}>
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
            ${(artStyle === CardArtStyles.Borderless) && styles.borderless}
            ${(isToken) && styles.token}
            ${(isInvention) && styles.invention}
            ${(artStyle === CardArtStyles.Extended) && styles.extended}
            ${(color === ColorType.Colorless) && styles.colorless}
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
                        className={`${styles.mainframe} ${
                            isToken
                                ? styles.tokenMainframe
                                : isInvention
                                    ? styles.inventionMainframe
                                    : ''
                        }`}
                        fallBackColor={artStyle !== CardArtStyles.Borderless ? hexColor : undefined}
                    />

                    {isNickname && (
                        <ImageLoader
                            src={getNicknameTitle(color, isArtifact, isLand)}
                            className={styles.nickname}
                        />
                    )}
                    {crownBlack}
                    {crown}
                    {crownInner}

                    {/*{!isToken && !isInvention && innerBorderFrame ? <img className={styles.innerBorderFrame} src={innerBorderFrame} alt="" /> : null}*/}
                    {/*{overlay ? <img className={styles.overlay} src={overlay} alt="" /> : null}*/}

                    <ImageLoader src={getRarityIcon(rarity)} alt=""
                                 className={`${styles.rarity} ${isToken ? styles.tokenRarity : ''}`}/>

                    {isCreature && (
                        <div>
                            {pt ? <img className={styles.pt} src={pt} alt=""/> : null}
                            <div className={styles.stats}>
                                {`${parseStats(cardStats).power}/${parseStats(cardStats).toughness}`}
                            </div>
                        </div>
                    )}

                    {cardRenderProps.cardMainType !== CardMainType.Land && !isToken && !backFace && (
                        <div
                            className={`${styles.cost} ${isToken ? styles.tokenCost : ''}`}>{injectManaIcons(orderedCost, true)}</div>
                    )}

                    <div className={`${styles.title} ${isToken ? styles.tokenTitle : ''}`}>{name}</div>
                    {nickname && <div className={styles.nicknameText}>{nickname}</div>}
                    <div className={`${styles.type} ${isToken ? styles.tokenType : ''}`}>
                        {legendary ? 'Legendary ' : ''}
                        {cardMainType}
                        {[vehicle ? 'Vehicle' : '', cardSubTypes].filter(Boolean).join(' ')
                            ? ` – ${[vehicle ? 'Vehicle' : '', cardSubTypes].filter(Boolean).join(' ')}`
                            : ''}
                    </div>

                    <div className={`${styles.text} ${isToken ? styles.tokenText : ''}`}>
                        <TextResize
                            defaultFontSize={20}
                            maxFontSize={32}
                            minFontSize={14}
                            className={styles.textWrap}
                        >
                            <div>
                                {cardText.map((val, i) => (
                                    <p key={`card-text-${cardID}-${i}`}>{injectForText(val, name, mechanics)}</p>
                                ))}
                                <FlavourText name={name} flavourText={flavourText} flavourAuthor={flavourAuthor}/>
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
              <Mana symbol="artist-nib"/>
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
