import React from 'react';

import 'mana-font/css/mana.css';

import './css/reset.css';

import './css/background.css';
import './css/borders.scss';
import './css/icons.css';
import './css/card.css';
// @ts-ignore
import LazyLoad from 'react-lazy-load';
import { CardMainType, Creators, RarityType } from '../../interfaces/enums';

import CommonIcon from './images/rarity/common.png';
import UncommonIcon from './images/rarity/uncommon.png';
import RareIcon from './images/rarity/rare.png';
import MythicRareIcon from './images/rarity/mythic.png';

import NoCover from './images/no-cover.jpg';
// @ts-ignore

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
  containerWidth?: number;
}

const CardRender = (cardRender: CardRender) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText, flavourAuthor, cardID } = cardRender;
  const { backFace, keywords, collectionNumber, collectionSize } = cardRender;
  const { containerWidth = 488 } = cardRender;

  const getRarityIcon = () => {
    if (rarity === RarityType.MythicRare) return MythicRareIcon;
    if (rarity === RarityType.Rare) return RareIcon;
    if (rarity === RarityType.Uncommon) return UncommonIcon;
    return CommonIcon;
  };

  const { color, allColors } = cardToColor(cardMainType, manaCost);

  let cssColorName: string = color;
  if (cardMainType === CardMainType.Planeswalker) {
    if (allColors.length === 1) cssColorName = `${color}-${color}`;
    if (allColors.length === 2) cssColorName = `${allColors[0]}-${allColors[1]}`;
    if (allColors.length > 2) cssColorName = `gold-gold`;
  }

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

  return (
    <div style={{ height: `${getHeight(containerWidth)}px` }}>
      <div
        id={`card-id-${cardID}`}
        className="card-container"
        style={{
          transform: `scale(${resizeFactor(containerWidth)})`,
          transformOrigin: 'top left'
        }}
      >
        <LazyLoad debounce={false}>
          <div>
            <div className={`card-background card-background-${color}`} />
            {/* <ImageLoader */}
            {/*  className="card-background" */}
            {/*  src={colorToBackground()} */}
            {/* /> */}
            <div className="card-frame">
              <div
                className={`frame-header-special-border frame-header-planeswalker-${cssColorName}`}
              />
              <div
                className={`frame-header frame-header-${color} frame-header-planeswalker-${cssColorName}`}
              >
                <h1 className="name">{injectQuotationMarks(name)}</h1>
                {cardRender.cardMainType !== CardMainType.Land && !backFace && (
                  <div className="cost">{injectManaIcons(manaCost, true)}</div>
                )}
              </div>

              <ImageLoader
                src={cover || NoCover}
                alt="cover"
                className={`frame-art frame-art-${cssColorName}`}
              />

              <div
                className={`frame-type-line frame-type-line-${color} frame-type-line-${cssColorName}`}
              >
                <h1 className="type">
                  {legendary ? 'Legendary ' : ''}
                  {cardMainType}
                  {/* long dash: – or — */}
                  {cardSubTypes ? ` – ${cardSubTypes}` : ''}
                </h1>
                <ImageLoader src={getRarityIcon()} id="set-icon" alt="rarity-icon" />
              </div>

              <div
                className={`frame-text-box frame-text-box-${color} frame-text-box-${cssColorName}`}
              >
                <p className="description ftb-inner-margin">
                  {cardText.map(val => (
                    <span className="new-instruction">
                      {injectQuotationMarks(
                        injectPlaneswalkerIcons(
                          injectManaIcons(injectKeywords(injectName(val, name), keywords))
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
                  cardMainType === CardMainType.Creature ? 'frame-stats' : 'hidden'
                } frame-stats-${color}`}
              >
                <div className={`frame-inner-stats frame-inner-stats-${color}`}>
                  <h1 className="stats">{cardStats}</h1>
                </div>
              </div>

              <div
                className={`${
                  cardMainType === CardMainType.Planeswalker ? 'frame-loyalty' : 'hidden'
                }`}
              >
                <div>
                  <h1 className="stats">
                    <i
                      className={`ms ms-loyalty-${cardStats} ms-loyalty-start loyalty-outline-start`}
                    />
                    <i className={`ms ms-loyalty-${cardStats} ms-loyalty-start`} />
                  </h1>
                </div>
              </div>

              <div className="frame-bottom-info inner-margin">
                <div className="fbi-left">
                  <p>{`${collectionNumber}/${collectionSize} ${rarityCode()}`}</p>
                  <p>
                    <span>EPIC &#x2022; EN</span>
                    <img
                      className="paintbrush"
                      src="https://image.ibb.co/e2VxAS/paintbrush_white.png"
                      alt="paintbrush icon"
                    />
                    {creator || Creators.UNKNOWN}
                  </p>
                </div>

                <div className="fbi-center" />

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
  );
};

export default CardRender;
