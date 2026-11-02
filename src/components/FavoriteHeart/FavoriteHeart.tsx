import React from 'react';
import styles from './FavoriteHeart.module.scss';
import { HeartFilled } from '@ant-design/icons';

interface FavoriteHeartProps {
  favorite?: boolean;
}

const FavoriteHeart = ({ favorite }: FavoriteHeartProps) =>
  favorite ? (
    <span className={styles.heart} role="img" aria-label="Favorite card">
      <HeartFilled />
    </span>
  ) : null;

export default FavoriteHeart;
