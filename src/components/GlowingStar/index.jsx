import React from 'react';
import StarFilled from '@ant-design/icons/StarFilled';
import styles from './index.module.scss';

const GlowingStar = () => (
  <span className={styles.glowingStar} role="img" aria-label="New card" title="New card">
    <StarFilled aria-hidden="true" />
  </span>
);
export default GlowingStar;
