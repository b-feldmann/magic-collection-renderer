import React from 'react';
// @ts-ignore
import useResizeAware from 'react-resize-aware';

import CardInterface from '../../interfaces/CardInterface';

import 'mana-font/css/mana.css';

import './css/reset.css';

import './css/background.css';
import './css/borders.css';
import './css/icons.css';
import './css/card.css';
import { CardMainType, ColorType, RarityType } from '../../interfaces/enums';

import CommonIcon from './images/rarity/common.png';
import UncommonIcon from './images/rarity/uncommon.png';
import RareIcon from './images/rarity/rare.png';
import MythicRareIcon from './images/rarity/mythic.png';

import NoCover from './images/no-cover.jpg';

import {
  injectManaIcons,
  injectName,
  injectNewLine,
  injectPlaneswalkerIcons,
  injectQuotationMarks
} from './injectUtils';

const CardRender: React.FC<CardInterface> = (card: CardInterface) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = card;
  const { name, manaCost, cardStats, cover, creator } = card;
  const { cardText, flavourText, flavourAuthor, cardID, rowNumber } = card;

  const [resizeListener, sizes] = useResizeAware();

  const getRarityIcon = () => {
    if (rarity === RarityType.MythicRare) return MythicRareIcon;
    if (rarity === RarityType.Rare) return RareIcon;
    if (rarity === RarityType.Uncommon) return UncommonIcon;
    return CommonIcon;
  };

  let color: ColorType = ColorType.Colorless;
  if (
    cardMainType === CardMainType.Land ||
    cardMainType === CardMainType.BasicLand
  ) {
    color = ColorType.Land;
  } else if (cardMainType === CardMainType.Planeswalker) {
    color = ColorType.Planeswalker;
  } else {
    const setColor = (type: ColorType) => {
      if (color === type) return;
      if (color === ColorType.Colorless) color = type;
      else color = ColorType.Gold;
    };

    for (let i = 0; i < manaCost.length; i++) {
      switch (manaCost.charAt(i)) {
        case 'w':
        case 'W':
          setColor(ColorType.White);
          break;
        case 'b':
        case 'B':
          setColor(ColorType.Black);
          break;
        case 'u':
        case 'U':
          setColor(ColorType.Blue);
          break;
        case 'r':
        case 'R':
          setColor(ColorType.Red);
          break;
        case 'g':
        case 'G':
          setColor(ColorType.Green);
          break;
        default:
          continue;
      }
    }
  }

  const margin = 8;

  const resizeFactor = () => {
    return (sizes.width - 2 * margin) / (488.0 - 2 * margin);
  };

  const getHeight = () => {
    return resizeFactor() * 680 + margin;
  };

  return (
    <div style={{ height: `${getHeight()}px` }}>
      {resizeListener}
      <div
        id={`card-id-${cardID}`}
        className="card-container"
        style={{
          transform: `scale(${resizeFactor()}) translate(${margin}px)`,
          transformOrigin: 'top left'
        }}
      >
        <div className={`card-background card-background-${color}`}>
          <div className="card-frame">
            <div className={`frame-header frame-header-${color}`}>
              <h1 className="name">{injectQuotationMarks(name)}</h1>
              <div className="cost">{injectManaIcons(manaCost)}</div>
            </div>

            <img
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
              <img src={getRarityIcon()} id="set-icon" alt="OGW-icon" />
            </div>

            <div className={`frame-text-box frame-text-box-${color}`}>
              <p className="description ftb-inner-margin">
                {injectQuotationMarks(
                  injectPlaneswalkerIcons(
                    injectManaIcons(injectNewLine(injectName(cardText, name)))
                  )
                )}
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
              <div className={`frame-inner-stats frame-inner-stats-${color}`}>
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
                  {rowNumber}/184 {rarity}
                </p>
                <p>
                  EPIC &#x2022; EN
                  <img
                    className="paintbrush"
                    src="https://image.ibb.co/e2VxAS/paintbrush_white.png"
                    alt="paintbrush icon"
                  />
                  {creator}
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
      </div>
    </div>
  );
};

export default CardRender;
