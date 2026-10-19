import React from 'react';
import styles from './FavoriteHeart.module.scss';

interface FavoriteHeartProps {
  favorite?: boolean;
}

const FavoriteHeart = ({ favorite }: FavoriteHeartProps) =>
  favorite ? (
    <span className={styles.heart} role="img" aria-label="Favorite card">
      ❤️
    </span>
  ) : null;

export default FavoriteHeart;
