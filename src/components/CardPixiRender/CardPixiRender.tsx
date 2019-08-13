import React, { useState, useRef, useEffect } from 'react';

import 'mana-font/css/mana.css';

import * as PIXI from 'pixi.js';
import { CardMainType, ColorType, Creators, RarityType } from '../../interfaces/enums';

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

import TextboxTile from './images/tile_bg_2.jpg';

import NoCover from './images/no-cover.jpg';
import cardToColor from './cardToColor';

import { renderBackground, RenderBackgroundCache } from './renderBackground';
import { renderArtBox, RenderArtBoxCache } from './renderArtBox';
import { renderTextBox, RenderTextBoxCache } from './renderTextBox';

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
  containerWidth?: number;
}

const CardPixiRender: React.FC<CardWebGLRender> = (cardRender: CardWebGLRender) => {
  const { legendary, cardMainType, cardSubTypes, rarity } = cardRender;
  const { name, manaCost, cardStats, cover, creator } = cardRender;
  const { cardText, flavourText, flavourAuthor, cardID } = cardRender;
  const { backFace, keywords, collectionNumber, collectionSize } = cardRender;
  const { containerWidth = 488 } = cardRender;

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

  const borderColor = (): number => {
    switch (color) {
      case ColorType.White:
        return 0xe0e4e3;
      case ColorType.Blue:
        return 0x0456a8;
      case ColorType.Black:
        return 0x464e39;
      case ColorType.Red:
        return 0xdf3619;
      case ColorType.Green:
        return 0x26714a;
      case ColorType.Gold:
        return 0xeed66b;
      case ColorType.Land:
        return 0xeed66b;
      case ColorType.Colorless:
        return 0xd9d7da;
      default:
        return 0xd9d7da;
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
  const [backgroundCache, setBackgroundCache] = useState<RenderBackgroundCache>();
  const [artBoxCache, setArtBoxCache] = useState<RenderArtBoxCache>();
  const [textBoxCache, setTextBoxCache] = useState<RenderTextBoxCache>();

  const pixiRef = useRef(null);

  const renderCard = (useCache?: boolean) => {
    let cache: any = renderBackground(
      app,
      resources,
      colorToBackground(),
      useCache ? backgroundCache : undefined
    );
    setBackgroundCache(cache);

    cache = renderArtBox(
      app,
      resources,
      borderColor(),
      cover,
      NoCover,
      useCache ? artBoxCache : undefined
    );
    setArtBoxCache(cache);

    cache = renderTextBox(
      app,
      resources,
      TextboxTile,
      borderColor(),
      cardText,
      flavourText,
      flavourAuthor,
      useCache ? textBoxCache : undefined
    );
    setTextBoxCache(cache);
  };

  useEffect(() => {
    if (resources) {
      renderCard();
      console.log('render');
    }
  }, [cover]);

  useEffect(() => {
    if (resources) {
      renderCard(false);
      console.log('render');
    }
  }, [resources, manaCost]);

  useEffect(() => {
    const newApp = new PIXI.Application({
      width: 530,
      height: 740,
      transparent: true,
      antialias: true
    });
    newApp.loader
      .add(BackgroundWhite)
      .add(BackgroundBlue)
      .add(BackgroundBlack)
      .add(BackgroundRed)
      .add(BackgroundGreen)
      .add(BackgroundGold)
      .add(BackgroundLand)
      .add(BackgroundColorless)
      .add(NoCover)
      .add(TextboxTile)
      .load((loader: any, loadedResources: any) => {
        // @ts-ignore
        pixiRef.current.appendChild(newApp.view);

        setResources(loadedResources);
      });

    setApp(newApp);
  }, []);

  return (
    <div style={{ height: `${getHeight(containerWidth)}px` }}>
      <div
        id={`card-id-${cardID}`}
        style={{
          transform: `scale(${resizeFactor(containerWidth)})`,
          transformOrigin: 'top left'
        }}
      >
        <div ref={pixiRef} />
      </div>
    </div>
  );
};

export default CardPixiRender;
