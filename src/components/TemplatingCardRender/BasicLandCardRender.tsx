import React from 'react';

import 'mana-font/css/mana.css';
// @ts-ignore
import {Mana} from '../Mana/Mana';

import {BasicLandArtStyles, BasicLandType, RarityType,} from '../../interfaces/enums';
import {getBasicLandColor} from '../../utils/cardToColor';

import styles from './TemplatingCardRender.module.scss';
import {getBasicLandMainframe, getBasicLandSymbols, getFallbackCover, getRarityIcon,} from './assetLoader';
import ImageLoader from '../ImageLoader/ImageLoader';
import parseCollectionNumber from '../../utils/parseCollectionNumber';
import { CARD_WIDTH, CARD_HEIGHT } from '../../utils/constants';

interface BasicLandCardRenderProps {
  cardID: string;
  creator?: string;
  landType: BasicLandType;
  cover?: string;
  artStyle: BasicLandArtStyles;
  collectionNumber: number;
  collectionSize: number;
  containerWidth?: number;
}

const BasicLandCardRender = (cardRender: BasicLandCardRenderProps) => {
  const { creator, collectionNumber, collectionSize } = cardRender;
  const { landType, cover, artStyle, cardID } = cardRender;
  const { containerWidth = CARD_WIDTH } = cardRender;

  const resizeFactor = (width: number) => {
    return width / CARD_WIDTH;
  };

  const getHeight = (width: number) => {
    return resizeFactor(width) * CARD_HEIGHT;
  };

  const mainframe = getBasicLandMainframe(landType, artStyle);
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
          style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}
          className={`${styles.cardRender} 
            ${artStyle === BasicLandArtStyles.Unstable && styles.unstableStyle}
            ${artStyle === BasicLandArtStyles.FullArt && styles.landFullArtStyle}
          `}
        >
          <ImageLoader
            src={cover || getFallbackCover()}
            alt="cover"
            className={`${styles.cover} ${
              artStyle !== BasicLandArtStyles.Unstable && 'card-cover'
            }`}
          />
          <ImageLoader
            src={mainframe}
            className={styles.mainframe}
            fallBackColor={getBasicLandColor(landType || BasicLandType.Plains)}
          />

          {artStyle === BasicLandArtStyles.Unstable ? (
            <div className={styles.basicLandTitle}>{landType}</div>
          ) : (
            <div>
              <div className={styles.title}>{landType}</div>
              {artStyle === BasicLandArtStyles.FullArt ? (
                <div>
                  <div className={styles.type}>Basic Land</div>
                  <div className={styles.type2}>{landType}</div>
                </div>
              ) : (
                <div className={styles.type}>{`Basic Land – ${landType}`}</div>
              )}
              <ImageLoader
                src={getRarityIcon(RarityType.Common)}
                alt=""
                className={styles.rarity}
              />
              <div className={styles.landSymbol}>
                <ImageLoader src={getBasicLandSymbols(landType)} />
              </div>
            </div>
          )}

          <div className={styles.collectionBlock}>
            {`${parseCollectionNumber(collectionNumber)}/${parseCollectionNumber(collectionSize)}`}
            {' L'}
          </div>
          <div className={styles.collectionBlock2}>
            MFS &#x2022; EN
            <span className={styles.brush}>
              <Mana symbol="artist-nib" />
            </span>
            <span className={styles.artist}>{creator}</span>
          </div>
          <div className={styles.copyright}>&#8482; &amp; &#169; 2019 BJennWare</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BasicLandCardRender);
