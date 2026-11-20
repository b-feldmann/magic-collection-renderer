import React, { useMemo, useState } from 'react';
import CardInterface from '../../interfaces/CardInterface';
import {
  balanceRarities,
  BalanceRarity,
  balanceRoles,
  BalanceCard,
  BalanceRow,
  buildLimitedBalance,
  powerBuckets,
} from './limitedBalanceData';
import styles from './collectionStats.module.scss';

const formatAverage = (value: number | null) => (value === null ? '–' : value.toFixed(1));

// The card names behind a count, for the tooltip.
const names = (cards: BalanceCard[]) =>
  cards
    .map(card => card.name)
    .sort((a, b) => a.localeCompare(b))
    .join(', ');

// A count with a bar scaled to the largest color in its column, so imbalances stand out.
const CountCell = ({
  cards,
  maximum,
  label,
  isTotal,
}: {
  cards: BalanceCard[];
  maximum: number;
  label: string;
  isTotal: boolean;
}) => (
  <td
    className={`${styles.balanceCount} ${cards.length === 0 ? styles.balanceZero : ''}`}
    title={cards.length ? `${label}: ${names(cards)}` : undefined}
  >
    <span>{cards.length}</span>
    {!isTotal && (
      <span
        className={styles.balanceBar}
        style={{ '--share': maximum ? cards.length / maximum : 0 } as React.CSSProperties}
        aria-hidden="true"
      />
    )}
  </td>
);

const PowerSpread = ({ counts }: { counts: number[] }) => {
  const maximum = Math.max(1, ...counts);
  const description = powerBuckets
    .map((bucket, index) => `power ${bucket}: ${counts[index]}`)
    .join(', ');
  return (
    <span className={styles.powerSpread} role="img" aria-label={description} title={description}>
      {counts.map((count, index) => (
        <span key={powerBuckets[index]} className={styles.powerSpreadColumn}>
          <span
            className={styles.powerSpreadBar}
            style={{ '--share': count / maximum } as React.CSSProperties}
          />
          <span className={styles.powerSpreadLabel}>{powerBuckets[index]}</span>
        </span>
      ))}
    </span>
  );
};

const BalanceTableRow = ({
  row,
  maxima,
  isTotal = false,
}: {
  row: BalanceRow;
  maxima: Record<string, number>;
  isTotal?: boolean;
}) => {
  const creaturePercent = row.nonlandCount
    ? Math.round((row.creatures.length / row.nonlandCount) * 100)
    : 0;
  return (
    <tr className={isTotal ? styles.balanceTotal : undefined}>
      <th scope="row" style={{ '--color-list-accent': row.category.color } as React.CSSProperties}>
        {row.category.label}
      </th>
      <td>
        {row.nonlandCount}
        {row.landCount > 0 && (
          <span className={styles.balanceDetail}>
            {' '}
            + {row.landCount} {row.landCount === 1 ? 'land' : 'lands'}
          </span>
        )}
      </td>
      <td>{formatAverage(row.averageManaValue)}</td>
      <td title={row.creatures.length ? `Creatures: ${names(row.creatures)}` : undefined}>
        {row.creatures.length}
        <span className={styles.balanceDetail}> · {creaturePercent}%</span>
      </td>
      <td>
        {formatAverage(row.averagePower)} / {formatAverage(row.averageToughness)}
      </td>
      <td>
        <PowerSpread counts={row.powerCounts} />
      </td>
      {balanceRoles.map(({ tag, label }) => (
        <CountCell
          key={tag}
          cards={row.roles[tag]}
          maximum={maxima[tag]}
          label={label}
          isTotal={isTotal}
        />
      ))}
    </tr>
  );
};

const LimitedBalance = ({
  collection,
  allCards = collection,
}: {
  collection: CardInterface[];
  allCards?: CardInterface[];
}) => {
  const [rarity, setRarity] = useState<BalanceRarity>('all');
  const balance = useMemo(
    () => buildLimitedBalance(collection, allCards, rarity),
    [collection, allCards, rarity],
  );
  const maxima = Object.fromEntries(
    balanceRoles.map(({ tag }) => [
      tag,
      Math.max(0, ...balance.rows.map(row => row.roles[tag].length)),
    ]),
  );
  const isEmpty = balance.total.nonlandCount + balance.total.landCount === 0;

  return (
    <section className={styles.curveSection} aria-label="Limited balance">
      <div className={styles.sectionHeading}>
        <h2>Limited balance</h2>
        <div className={styles.layoutSwitch} role="group" aria-label="Rarity">
          {balanceRarities.map(option => (
            <button
              key={option.key}
              type="button"
              aria-pressed={rarity === option.key}
              onClick={() => setRarity(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.sectionNote}>
        Roles come from tags, such as the automatic Creature Removal, Evasion or Card Draw tags.
        Bars compare the colors in each column; hover a count to see its cards. Variants count once;
        tokens and emblems are left out.
      </p>
      {isEmpty ? (
        <p className={styles.sectionNote}>No cards to compare.</p>
      ) : (
        <div className={styles.colorCardTableScroll}>
          <table className={styles.balanceTable}>
            <thead>
              <tr>
                <th scope="col">Color</th>
                <th scope="col">Nonlands</th>
                <th scope="col">
                  <abbr title="Average mana value of nonland cards">Avg MV</abbr>
                </th>
                <th scope="col">Creatures</th>
                <th scope="col">
                  <abbr title="Average power / toughness of creatures">Avg P/T</abbr>
                </th>
                <th scope="col">Power spread</th>
                {balanceRoles.map(({ tag, label }) => (
                  <th key={tag} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balance.rows.map(row => (
                <BalanceTableRow key={row.category.key} row={row} maxima={maxima} />
              ))}
            </tbody>
            <tfoot>
              <BalanceTableRow row={balance.total} maxima={maxima} isTotal />
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};

export default LimitedBalance;
