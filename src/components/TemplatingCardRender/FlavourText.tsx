import React from 'react';

import styles from './TemplatingCardRender.module.scss';

import { injectForFlavour } from '../../utils/injectUtils';

interface FlavourTextProps {
  name: string;
  flavourText?: string;
  flavourAuthor?: string;
}

// MPlantin Italic has no kerning between a period/comma and the closing quote,
// so "zesty.”" shows a gap that printed cards don't have.
const ENDS_WITH_PUNCTUATION = /[.,!?…]$/;

// Print sets a spaced ellipsis (". . .") with thin spaces, also after the last
// dot; full word spaces spread it ≈4px per gap wider.
const SPACED_ELLIPSIS = /\.(?: \.){2} ?/g;
const tightenEllipses = (text: string) =>
  text.replace(SPACED_ELLIPSIS, match => match.replace(/ /g, ' '));

const FlavourText = ({ name, flavourText = '', flavourAuthor }: FlavourTextProps) => {
  // Trailing whitespace (e.g. a final newline) would render as a gap before
  // the closing quote.
  let text = tightenEllipses(flavourText.trim());
  if (text.length === 0) return <div />;

  const author = flavourAuthor?.trim();

  // A closing quote typed into the text itself (curly, or a straight one that
  // formatting would curl) is rendered (and kerned) like the one added for an
  // attribution.
  const typedClosingQuote = /["”]$/.test(text) && text.length > 1;
  if (typedClosingQuote) text = text.slice(0, -1);
  const closingQuote = author || typedClosingQuote;

  return (
    <div className={styles.flavour} data-flavour>
      <div className={styles.flavourSeparator} />
      {author ? '“' : null}
      {injectForFlavour(text, name)}
      {closingQuote ? (
        <span className={ENDS_WITH_PUNCTUATION.test(text) ? styles.kernedQuote : undefined}>”</span>
      ) : null}
      {author && (
        <span>
          <br />
          {/* Printed attributions join the em dash and the name without a space. */}
          {`—${author}`}
        </span>
      )}
    </div>
  );
};

export default FlavourText;
