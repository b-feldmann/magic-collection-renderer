import React from 'react';

import styles from './TemplatingCardRender.module.scss';

import { injectForFlavour } from '../../utils/injectUtils';

interface FlavourTextProps {
  name: string;
  flavourText?: string;
  flavourAuthor?: string;
}

const FlavourText = ({ name, flavourText = '', flavourAuthor }: FlavourTextProps) => {
  return (
    <div className={styles.flavour}>
      <div className={styles.flavourSeparator} />
      {flavourAuthor
        ? `“${injectForFlavour(flavourText, name)}”`
        : injectForFlavour(flavourText, name)}
      {flavourAuthor && (
        <span>
          <br />
          {`— ${flavourAuthor}`}
        </span>
      )}
    </div>
  );
};

export default FlavourText;
