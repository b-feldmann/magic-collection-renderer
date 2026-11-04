import React, { useId, useState } from 'react';
import { ChartCategory, ChartLayout, ManaCurvePoint } from './collectionStatsData';
import styles from './collectionStats.module.scss';

export const formatCount = (count: number, unit: 'cards' | 'tag matches' = 'cards') =>
  `${count} ${count === 1 ? (unit === 'cards' ? 'card' : 'tag match') : unit}`;

const ManaCurveChart = ({
  title,
  data,
  categories,
  maxCount,
  layout,
  compact = false,
  countUnit = 'cards',
  className = '',
}: {
  title: string;
  data: ManaCurvePoint[];
  categories: ChartCategory[];
  maxCount: number;
  layout: ChartLayout;
  compact?: boolean;
  countUnit?: 'cards' | 'tag matches';
  className?: string;
}): React.JSX.Element => {
  const descriptionId = useId();
  // Every category seen so far keeps its segments mounted, so a bar can shrink to nothing
  // when filtering removes the category, rather than vanishing at once.
  const [knownCategories, setKnownCategories] = useState(categories);
  const newCategories = categories.filter(
    category => !knownCategories.some(known => known.key === category.key),
  );
  if (newCategories.length > 0) setKnownCategories([...knownCategories, ...newCategories]);
  const stackPositions = new Map(
    categories.map((category, position) => [category.key, { category, position }]),
  );
  const maximum = Math.max(1, maxCount);
  const totalAt = (point: ManaCurvePoint) =>
    categories.reduce((sum, category) => sum + (point[category.key] || 0), 0);
  const total = data.reduce((sum, point) => sum + totalAt(point), 0);
  const countText = formatCount(total, countUnit);
  const tickAt = (cmc: number) => (cmc === 7 ? '7+' : String(cmc));
  const describe = (point: ManaCurvePoint) =>
    categories
      .filter(category => point[category.key] > 0)
      .map(category => `${point[category.key]} ${category.label}`)
      .join(', ') || 'No cards';
  // Individual charts label every bar with its count, so only stacked ones need an axis.
  const showYAxis = !compact && layout === 'stacked';
  const axisTicks = [
    ...new Set([0, Math.ceil(maximum / 3), Math.ceil((maximum * 2) / 3), maximum]),
  ];

  return (
    <figure
      className={`${styles.chart} ${compact ? styles.compactChart : ''} ${showYAxis ? '' : styles.noYAxis} ${className}`}
    >
      <figcaption className={styles.chartHeading}>
        <h3>{title}</h3>
        <span>{countText}</span>
      </figcaption>
      <div className={styles.chartGraph}>
        <div className={styles.plotViewport}>
          <div
            className={styles.plot}
            role="img"
            aria-label={`Mana curve by ${title.toLowerCase()}: ${countText}`}
            aria-describedby={descriptionId}
          >
            {showYAxis &&
              axisTicks.map((tick, index) => (
                <span
                  className={styles.gridLine}
                  // By position, so a line glides to its new height when the scale changes.
                  key={index}
                  style={{ bottom: `calc(22px + (100% - 22px) * ${tick / maximum})` }}
                  aria-hidden="true"
                >
                  <span>{tick}</span>
                </span>
              ))}
            {data.map(point => {
              const value = tickAt(point.cmc);
              const count = totalAt(point);
              return (
                <div
                  className={styles.barColumn}
                  key={point.cmc}
                  title={`Mana value ${value}: ${describe(point)}`}
                >
                  <div className={styles.barStack}>
                    {knownCategories.map(known => {
                      const current = stackPositions.get(known.key);
                      const category = current?.category ?? known;
                      const segment = current ? point[category.key] || 0 : 0;
                      return (
                        <span
                          className={styles.barSegment}
                          key={category.key}
                          title={
                            segment > 0
                              ? `${category.label}: ${formatCount(segment, countUnit)} at mana value ${value}`
                              : undefined
                          }
                          style={{
                            backgroundColor: category.color,
                            height: `${(segment / maximum) * 100}%`,
                            // CSS order, not DOM order: moving a node would cancel its transition.
                            order: current?.position ?? categories.length,
                          }}
                        >
                          {segment > 0 && !compact && layout === 'stacked' && (
                            <span className={styles.segmentCount}>{segment}</span>
                          )}
                        </span>
                      );
                    })}
                    {!compact && (
                      <span
                        className={styles.barCount}
                        aria-label={`Total at mana value ${value}: ${formatCount(count, countUnit)}`}
                        style={{ bottom: `${(count / maximum) * 100}%` }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                  <span className={styles.cmcLabel}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {!compact && <div className={styles.axisLabel}>Mana value</div>}
      {total === 0 && (
        <p className={styles.emptyState}>
          {countUnit === 'tag matches' ? 'No tagged nonland cards' : 'No cards'}
        </p>
      )}
      {layout === 'stacked' && categories.length > 0 && (
        <ul className={styles.legend} aria-label={`${title} legend`}>
          {categories.map(category => (
            <li key={category.key}>
              <span className={styles.legendSwatch} style={{ backgroundColor: category.color }} />
              {category.label}
            </li>
          ))}
        </ul>
      )}
      <p id={descriptionId} className={styles.visuallyHidden}>
        {data.map(point => `Mana value ${tickAt(point.cmc)}: ${describe(point)}.`).join(' ')}
      </p>
    </figure>
  );
};

export default ManaCurveChart;
