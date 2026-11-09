import React from 'react';
import CardHoverPreview from './CardHoverPreview';
import { ColorCardList, draftRoles } from './collectionStatsData';
import styles from './collectionStats.module.scss';

const ColorCardTable = ({
  list,
  collectionSize,
}: {
  list: ColorCardList;
  collectionSize: number;
}) => {
  const { category, tier, tierLabel, cards, roleCounts } = list;
  const headingId = `color-card-list-${category.key}-${tier}`;
  const roleSummary = draftRoles
    .filter(role => roleCounts[role] > 0)
    .map(role => `${roleCounts[role]}× ${role}`)
    .join(' · ');
  return (
    <section className={styles.colorCardList} aria-labelledby={headingId}>
      <header
        className={styles.colorCardListHeading}
        style={{ '--color-list-accent': category.color } as React.CSSProperties}
      >
        <h3 id={headingId}>
          {category.label} {tierLabel} ({cards.length})
        </h3>
        <span>{roleSummary}</span>
      </header>
      <div className={styles.colorCardTableScroll}>
        <table className={styles.colorCardTable}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Card type</th>
              <th scope="col">Draft role</th>
              <th scope="col">Creator</th>
              <th scope="col">Tags</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <CardHoverPreview
                key={card.uuid}
                card={card.card}
                collectionNumber={card.collectionNumber}
                collectionSize={collectionSize}
              >
                <tr className={styles.previewRow}>
                  <th scope="row">{card.name}</th>
                  <td>{card.cardType}</td>
                  <td>
                    <span className={styles.draftRole}>{card.draftRole}</span>
                  </td>
                  <td>{card.creator}</td>
                  <td>{card.tags.join(', ')}</td>
                </tr>
              </CardHoverPreview>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const ColorCardLists = ({ lists }: { lists: ColorCardList[] }) => {
  const filled = lists.filter(list => list.cards.length > 0);
  const collectionSize = lists.reduce((sum, list) => sum + list.cards.length, 0);
  return (
    <section className={styles.curveSection} aria-label="Cards by color">
      <div className={styles.sectionHeading}>
        <h2>Cards by color</h2>
        <span>Draft role from mana value · 5+ mana is Late-Drop</span>
      </div>
      {filled.length === 0 ? (
        <p className={styles.sectionNote}>No cards to list.</p>
      ) : (
        filled.map(list => (
          <ColorCardTable
            key={`${list.category.key}-${list.tier}`}
            list={list}
            collectionSize={collectionSize}
          />
        ))
      )}
    </section>
  );
};

export default ColorCardLists;
