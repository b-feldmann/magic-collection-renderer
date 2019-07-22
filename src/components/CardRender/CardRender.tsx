import React from 'react';

// @ts-ignore
import ReactResizeDetector from 'react-resize-detector';

import 'mana-font/css/mana.css';

import './css/reset.css';

import './css/background.css';
import './css/borders.scss';
import './css/icons.css';
import './css/card.css';
import {
  CardMainType,
  Creators,
  RarityType,
  ColorType
} from '../../interfaces/enums';

import CommonIcon from './images/rarity/common.png';
import UncommonIcon from './images/rarity/uncommon.png';
import RareIcon from './images/rarity/rare.png';
import MythicRareIcon from './images/rarity/mythic.png';

import BackgroundWhite from './images/white-background.png';
import BackgroundBlue from './images/blue-background.png';
import BackgroundBlack from './images/black-background.png';
import BackgroundRed from './images/red-background.png';
import BackgroundGreen from './images/green-background.png';
import BackgroundGold from './images/gold-background.png';
import BackgroundLand from './images/land-background.png';
import BackgroundColorless from './images/artifact.png';

import NoCover from './images/no-cover.jpg';

// @ts-ignore
import LazyLoad from 'react-lazy-load';

import {
  injectKeywords,
  injectManaIcons,
  injectName,
  injectPlaneswalkerIcons,
  injectQuotationMarks
} from './injectUtils';
import cardToColor from './cardToColor';
import ImageLoader from '../ImageLoader/ImageLoader';

interface CardRender {
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
  keywords: string[];
  collectionNumber: number;
  collectionSize: number;
}

const CardRender: React.FC<CardRender> = (cardRender: CardRender) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText, flavourAuthor, cardID } = cardRender;
  const { backFace, keywords, collectionNumber, collectionSize } = cardRender;

  const getRarityIcon = () => {
    if (rarity === RarityType.MythicRare) return MythicRareIcon;
    if (rarity === RarityType.Rare) return RareIcon;
    if (rarity === RarityType.Uncommon) return UncommonIcon;
    return CommonIcon;
  };

  const color = cardToColor(cardMainType, manaCost);

  const rarityCode = () => {
    if (rarity === RarityType.Uncommon) return 'U';
    if (rarity === RarityType.Rare) return 'R';
    if (rarity === RarityType.MythicRare) return 'M';
    return 'C';
  };

  const resizeFactor = (width: number) => {
    return width / 488.0;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * 680;
  };

  const colorToBackground = () => {
    switch (color) {
      case ColorType.White:
        return BackgroundWhite;
      case ColorType.Blue:
        return BackgroundBlue;
      case ColorType.Black:
        return BackgroundBlack;
      case ColorType.Red:
        return BackgroundRed;
      case ColorType.Green:
        return BackgroundGreen;
      case ColorType.Gold:
        return BackgroundGold;
      case ColorType.Land:
        return BackgroundLand;
      case ColorType.Colorless:
        return BackgroundColorless;
      default:
        return BackgroundColorless;
    }
  };

  return (
    <ReactResizeDetector handleWidth>
      {({ width }: { width: number }) => (
        <div style={{ height: `${getHeight(width)}px` }}>
          <div
            id={`card-id-${cardID}`}
            className="card-container"
            style={{
              transform: `scale(${resizeFactor(width)})`,
              transformOrigin: 'top left'
            }}
          >
            <LazyLoad debounce={false}>
              <div>
                <div className={`card-background card-background-${color}`} />
                {/*<ImageLoader*/}
                {/*  className="card-background"*/}
                {/*  src={colorToBackground()}*/}
                {/*/>*/}
                <div className="card-frame">
                  <div className={`frame-header frame-header-${color}`}>
                    <h1 className="name">{injectQuotationMarks(name)}</h1>
                    {cardRender.cardMainType !== CardMainType.Land &&
                      !backFace && (
                        <div className="cost">
                          {injectManaIcons(manaCost, true)}
                        </div>
                      )}
                  </div>

                  <ImageLoader
                    className={`frame-art frame-art-${color}`}
                    src={cover ? cover : NoCover}
                    alt="cover"
                  />

                  <div className={`frame-type-line frame-type-line-${color}`}>
                    <h1 className="type">
                      {legendary ? 'Legendary ' : ''}
                      {cardMainType}
                      {/* long dash: – or — */}
                      {cardSubTypes ? ` – ${cardSubTypes}` : ''}
                    </h1>
                    <ImageLoader
                      src={getRarityIcon()}
                      id="set-icon"
                      alt="rarity-icon"
                    />
                  </div>

                  <div className={`frame-text-box frame-text-box-${color}`}>
                    <p className="description ftb-inner-margin">
                      {cardText.map((val, i) => (
                        <span
                          className="new-instruction"
                          key={`${cardID}-instruction-${i}`}
                        >
                          {injectQuotationMarks(
                            injectPlaneswalkerIcons(
                              injectManaIcons(
                                injectKeywords(injectName(val, name), keywords)
                              )
                            )
                          )}
                        </span>
                      ))}
                    </p>
                    <p className="flavour-text">
                      {flavourText && (
                        <span>
                          {flavourAuthor
                            ? `“${injectName(flavourText, name)}”`
                            : injectName(flavourText, name)}
                          {flavourAuthor ? (
                            <span>
                              <br />
                              {`— ${flavourAuthor}`}
                            </span>
                          ) : (
                            ''
                          )}
                        </span>
                      )}
                    </p>
                  </div>

                  <div
                    className={`${
                      cardMainType === CardMainType.Creature
                        ? 'frame-stats'
                        : 'hidden'
                    } frame-stats-${color}`}
                  >
                    <div
                      className={`frame-inner-stats frame-inner-stats-${color}`}
                    >
                      <h1 className="stats">{cardStats}</h1>
                    </div>
                  </div>

                  <div
                    className={`${
                      cardMainType === CardMainType.Planeswalker
                        ? 'frame-loyalty'
                        : 'hidden'
                    }`}
                  >
                    <div>
                      <h1 className="stats">
                        <i
                          className={`ms ms-loyalty-${cardStats} ms-loyalty-start loyalty-outline-start`}
                        />
                        <i
                          className={`ms ms-loyalty-${cardStats} ms-loyalty-start`}
                        />
                      </h1>
                    </div>
                  </div>

                  <div className="frame-bottom-info inner-margin">
                    <div className="fbi-left">
                      <p>
                        {collectionNumber}/{collectionSize} {rarityCode()}
                      </p>
                      <p>
                        EPIC &#x2022; EN
                        <img
                          className="paintbrush"
                          src="https://image.ibb.co/e2VxAS/paintbrush_white.png"
                          alt="paintbrush icon"
                        />
                        {creator || Creators.UNKNOWN}
                      </p>
                    </div>

                    <div className="fbi-center"></div>

                    <div className="fbi-right">
                      <br />
                      <p>&#x99; &amp; &#169; 2019 Wizards of the Coast</p>
                    </div>
                  </div>
                </div>
              </div>
            </LazyLoad>
          </div>
        </div>
      )}
    </ReactResizeDetector>
  );
};

export default CardRender;
