import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore
import ReactResizeDetector from 'react-resize-detector';

import 'mana-font/css/mana.css';

import {
  CardMainType,
  ColorType,
  Creators,
  RarityType
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
import cardToColor from './cardToColor';

import * as PIXI from 'pixi.js';
import { renderBackground, RenderBackgroundCache } from './renderBackground';
import { renderArtBox, RenderArtBoxCache } from './renderArtBox';

export interface Images {
  [key: string]: PIXI.Texture;
}

interface CardWebGLRender {
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

const CardPixiRender: React.FC<CardWebGLRender> = (
  cardRender: CardWebGLRender
) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText, flavourAuthor, cardID } = cardRender;
  const { backFace, keywords, collectionNumber, collectionSize } = cardRender;

  const { color, allColors } = cardToColor(cardMainType, manaCost);

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

  const resizeFactor = (width: number) => {
    return width / 530.0;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * 740;
  };

  const [app, setApp] = useState();

  const [resources, setResources] = useState(null);
  const [backgroundCache, setBackgroundCache] = useState<
    RenderBackgroundCache
  >();
  const [artBoxCache, setArtBoxCache] = useState<RenderArtBoxCache>();

  const pixiRef = useRef(null);

  const renderCard = () => {
    let cache: any = renderBackground(
      app,
      resources,
      colorToBackground(),
      backgroundCache
    );
    setBackgroundCache(cache);

    cache = renderArtBox(app, resources, cover, NoCover, artBoxCache);
    setArtBoxCache(cache);
  };

  useEffect(() => {
    if (resources) {
      renderCard();
      console.log('render');
    }
  }, [resources, manaCost, cover]);

  useEffect(() => {
    const app = new PIXI.Application({
      width: 530,
      height: 740,
      transparent: true,
      antialias: true
    });
    app.loader
      .add(BackgroundWhite)
      .add(BackgroundBlue)
      .add(BackgroundBlack)
      .add(BackgroundRed)
      .add(BackgroundGreen)
      .add(BackgroundGold)
      .add(BackgroundLand)
      .add(BackgroundColorless)
      .add(NoCover)
      .load((loader: any, resources: any) => {
        // @ts-ignore
        pixiRef.current.appendChild(app.view);

        setResources(resources);
      });

    setApp(app);
  }, []);

  return (
    <ReactResizeDetector handleWidth>
      {({ width }: { width: number }) => (
        <div style={{ height: `${getHeight(width)}px` }}>
          <div
            id={`card-id-${cardID}`}
            style={{
              transform: `scale(${resizeFactor(width)})`,
              transformOrigin: 'top left'
            }}
          >
            <div ref={pixiRef} />
          </div>
        </div>
      )}
    </ReactResizeDetector>
  );
};

export default CardPixiRender;
