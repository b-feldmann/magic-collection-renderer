import React from 'react';
import { TokenCardMatch } from '../../utils/tokenLinks';
import {
  tokenCardAbilitySummary,
  tokenCardDescription,
  tokenReferenceFor,
} from '../../utils/tokenReferences';
import styles from './styles.module.scss';

export interface TokenReferenceOption {
  key: string;
  // What goes inside the brackets: "1/1 blue Rogue with flying".
  reference: string;
  // "1/1 blue Rogue", and the token card's abilities.
  label: string;
  detail: string;
}

const MAX_OPTIONS = 8;

/** The token cards whose description, name, subtypes or abilities contain every typed word. */
export const getTokenReferenceOptions = (
  query: string,
  tokenCards: TokenCardMatch[],
): TokenReferenceOption[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokenCards
    .map(match => {
      const { face } = match;
      const label = tokenCardDescription(face);
      const detail = tokenCardAbilitySummary(face);
      const searchable = [label, face.name, face.cardSubTypes, face.cardStats, detail]
        .join(' ')
        .toLowerCase();
      return { match, label, detail, searchable };
    })
    .filter(({ searchable }) => words.every(word => searchable.includes(word)))
    .slice(0, MAX_OPTIONS)
    .map(({ match, label, detail }) => ({
      key: `${match.card.uuid}-${match.face === match.card.back ? 'back' : 'front'}`,
      reference: tokenReferenceFor(match.face),
      label,
      detail,
    }));
};

interface TokenReferenceOptionsProps {
  id: string;
  options: TokenReferenceOption[];
  activeIndex: number;
  onSelect: (option: TokenReferenceOption) => void;
}

export const tokenReferenceOptionId = (listId: string, index: number) => `${listId}-${index}`;

/** The token cards a "[Token: …]" reference can point at, shown below the rules text. */
const TokenReferenceOptions = ({
  id,
  options,
  activeIndex,
  onSelect,
}: TokenReferenceOptionsProps) => (
  <ul id={id} role="listbox" aria-label="Token cards" className={styles.tokenOptions}>
    {options.map((option, index) => (
      <li
        key={option.key}
        id={tokenReferenceOptionId(id, index)}
        role="option"
        aria-selected={index === activeIndex}
        className={styles.tokenOption}
        // Keep the focus (and caret) in the text while choosing.
        onMouseDown={event => event.preventDefault()}
        onClick={() => onSelect(option)}
      >
        <span className={styles.tokenOptionLabel}>{option.label}</span>
        {option.detail && <span className={styles.tokenOptionDetail}>{option.detail}</span>}
        <code className={styles.tokenOptionReference}>[Token: {option.reference}]</code>
      </li>
    ))}
  </ul>
);

export default TokenReferenceOptions;
