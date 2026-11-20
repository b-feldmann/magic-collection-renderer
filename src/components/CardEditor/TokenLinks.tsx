import React, { useContext, useEffect, useState } from 'react';
import CardRender from '../TemplatingCardRender/index';
import { Store } from '../../store';
import { getImage } from '../../actions/imageActions';
import { isLoadingCover } from '../../utils/cover';
import { TokenCardMatch, TokenLink } from '../../utils/tokenLinks';
import styles from './TokenLinks.module.scss';

// Used until the list is measured: two token cards side by side in the editor panel.
export const TOKEN_CARD_WIDTH = 150;
// Matches the list's column gap in TokenLinks.module.scss.
const COLUMN_GAP = 12;

// The width of each of the two columns the token cards fill.
const useColumnWidth = (element: HTMLElement | null) => {
  const [width, setWidth] = useState(TOKEN_CARD_WIDTH);
  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const listWidth = element.clientWidth;
      if (listWidth > 0) setWidth(Math.floor((listWidth - COLUMN_GAP) / 2));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return width;
};

interface LinkedCardPreviewProps {
  // Names the card for screen readers: "the 1/1 Soldier token card".
  description: string;
  width: number;
  match: TokenCardMatch;
  onOpenCard?: (uuid: string) => void;
}

const LinkedCardPreview = ({ description, width, match, onOpenCard }: LinkedCardPreviewProps) => {
  const { dispatch, cards } = useContext(Store);
  const { card, face } = match;
  const backFace = face === card.back;
  const faceIndex = backFace ? 1 : 0;

  // Uploaded art is loaded on demand, as in the collection grid.
  useEffect(() => {
    if (isLoadingCover(face.cover)) getImage(dispatch, card, faceIndex);
  }, [card, face.cover, faceIndex, dispatch]);

  const render = (
    <CardRender
      containerWidth={width}
      {...face}
      backFace={backFace}
      cardID={card.uuid}
      rarity={card.rarity}
      manaCost={card.manaCost}
      creator={card.creator?.name}
      collectionNumber={cards.findIndex(other => other.uuid === card.uuid) + 1}
      collectionSize={cards.length}
    />
  );

  return onOpenCard ? (
    <button
      type="button"
      className={styles.card}
      aria-label={`Open ${description}`}
      onClick={() => onOpenCard(card.uuid)}
    >
      {render}
    </button>
  ) : (
    <div className={styles.card} role="img" aria-label={description}>
      {render}
    </div>
  );
};

interface LinkedCardListProps {
  title: string;
  items: { description: string; match: TokenCardMatch }[];
  onOpenCard?: (uuid: string) => void;
}

// Linked cards rendered two side by side below a field.
const LinkedCardList = ({ title, items, onOpenCard }: LinkedCardListProps) => {
  // A callback ref, so the list is measured once it appears.
  const [list, setList] = useState<HTMLUListElement | null>(null);
  const width = useColumnWidth(list);
  if (!items.length) return null;

  return (
    <section className={styles.tokenLinks} aria-label={title}>
      <span className={styles.label}>{title}</span>
      <ul ref={setList} className={styles.list}>
        {items.map(({ description, match }) => (
          <li key={`${match.card.uuid}-${match.face === match.card.back ? 'back' : 'front'}`}>
            <LinkedCardPreview
              description={description}
              width={width}
              match={match}
              onOpenCard={onOpenCard}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

interface TokenLinksProps {
  links: TokenLink[];
  onOpenCard?: (uuid: string) => void;
}

/**
 * The token cards that print the tokens a rules text field creates, rendered below the field so
 * they're in view while the card is edited. Tokens without a token card are reported by the
 * templating hints instead.
 */
const TokenLinks = ({ links, onOpenCard }: TokenLinksProps): React.JSX.Element | null => {
  // One token card each, even when several lines create the same token.
  const items = [
    ...new Map(
      links.flatMap(({ token, match }) =>
        match
          ? [[match.card.uuid, { description: `the ${token.label} token card`, match }] as const]
          : [],
      ),
    ).values(),
  ];
  return <LinkedCardList title="Token cards" items={items} onOpenCard={onOpenCard} />;
};

interface TokenSourcesProps {
  sources: TokenCardMatch[];
  onOpenCard?: (uuid: string) => void;
}

/** The cards whose rules text creates the token a token card prints. */
export const TokenSources = ({
  sources,
  onOpenCard,
}: TokenSourcesProps): React.JSX.Element | null => (
  <LinkedCardList
    title="Cards that create this token"
    items={sources.map(match => ({ description: match.face.name || match.card.name, match }))}
    onOpenCard={onOpenCard}
  />
);

export default TokenLinks;
