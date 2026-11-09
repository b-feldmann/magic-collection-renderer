import React from 'react';

import styles from './TemplatingCardRender.module.scss';

/**
 * The legal line printed at the bottom of a card ("™ & © 2019 BJennWare").
 *
 * MPlantin's own ™ matches print, but its © is drawn with a heavy circle and
 * a thin C. Printed cards use a hairline circle around a small bold C, so the
 * © is rebuilt here.
 */
const LegalLine = () => (
  <>
    &#8482; &amp;{' '}
    <span className={styles.copyrightSign} role="img" aria-label="©">
      C
    </span>{' '}
    2019 BJennWare
  </>
);

export default LegalLine;
