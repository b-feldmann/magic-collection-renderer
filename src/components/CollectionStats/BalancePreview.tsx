import React, { useMemo } from 'react';
import CardInterface from '../../interfaces/CardInterface';
import { BalanceCard, BalanceRow, buildLimitedBalance } from './limitedBalanceData';
import styles from './collectionStats.module.scss';

// The five draft colors; Colorless and Multicolor are in the full table.
// Abbreviated as on mana symbols: Blue is U so it differs from Black.
const PREVIEW_COLORS: Record<string, string> = {
  white: 'W',
  blue: 'U',
  black: 'B',
  red: 'R',
  green: 'G',
};

// The numbers that matter most at a glance while designing.
const PREVIEW_ROWS: { label: string; cards: (row: BalanceRow) => BalanceCard[] }[] = [
  { label: 'Creatures', cards: row => row.creatures },
  { label: 'Removal', cards: row => row.roles['Creature Removal'] },
  { label: 'Evasion', cards: row => row.roles.Evasion },
  { label: 'Card draw', cards: row => row.roles['Card Draw'] },
];

const names = (cards: BalanceCard[]) =>
  cards
    .map(card => card.name)
    .sort((a, b) => a.localeCompare(b))
    .join(', ');

/** A compact Limited balance for the collapsed statistics: colors × key roles. */
const BalancePreview = ({
  collection,
  allCards = collection,
  onOpen,
}: {
  collection: CardInterface[];
  allCards?: CardInterface[];
  onOpen?: () => void;
}) => {
  const balance = useMemo(() => buildLimitedBalance(collection, allCards), [collection, allCards]);
  const rows = Object.keys(PREVIEW_COLORS).flatMap(
    key => balance.rows.find(row => row.category.key === key) ?? [],
  );

  return (
    <figure className={`${styles.chart} ${styles.compactChart} ${styles.balancePreview}`}>
      <figcaption className={styles.chartHeading}>
        <h3>Limited balance</h3>
        {onOpen ? (
          <button type="button" className={styles.balancePreviewOpen} onClick={onOpen}>
            Full table
          </button>
        ) : (
          <span>All rarities</span>
        )}
      </figcaption>
      <table className={styles.balancePreviewTable}>
        <thead>
          <tr>
            <td />
            {rows.map(row => (
              <th
                key={row.category.key}
                scope="col"
                style={{ '--color-list-accent': row.category.color } as React.CSSProperties}
              >
                <abbr title={row.category.label}>{PREVIEW_COLORS[row.category.key]}</abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PREVIEW_ROWS.map(({ label, cards }) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {rows.map(row => {
                const rowCards = cards(row);
                return (
                  <td
                    key={row.category.key}
                    className={rowCards.length === 0 ? styles.balanceZero : undefined}
                    title={
                      rowCards.length
                        ? `${row.category.label} ${label.toLowerCase()}: ${names(rowCards)}`
                        : `No ${row.category.label.toLowerCase()} ${label.toLowerCase()}`
                    }
                  >
                    <span>{rowCards.length}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

export default BalancePreview;
