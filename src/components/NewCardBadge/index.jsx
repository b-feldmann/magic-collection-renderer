import React from 'react';
import styles from './index.module.scss';

const NewCardBadge = () => (
  <span className={styles.newCardBadge} role="img" aria-label="New card" title="New card">
    <span aria-hidden="true">NEW</span>
  </span>
);
export default NewCardBadge;
