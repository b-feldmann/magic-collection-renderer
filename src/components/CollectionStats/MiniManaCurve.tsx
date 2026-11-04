import React, { useId } from 'react';
import { formatCount } from './ManaCurveChart';
import { ChartCategory, getSharedCountMaximum, ManaCurvePoint } from './collectionStatsData';
import styles from './collectionStats.module.scss';

/** Axis-free, single-color mana curve that fits inside the hidden statistics sheet. */
const MiniManaCurve = ({
  data,
  categories,
}: {
  data: ManaCurvePoint[];
  categories: ChartCategory[];
}): React.JSX.Element => {
  const descriptionId = useId();
  const maximum = getSharedCountMaximum(data, categories, 'stacked');
  const bars = data.map(point => {
    const label = point.cmc === 7 ? '7+' : String(point.cmc);
    const count = categories.reduce((sum, category) => sum + (point[category.key] || 0), 0);
    return { label, count, text: `Mana value ${label}: ${formatCount(count)}` };
  });
  const total = bars.reduce((sum, bar) => sum + bar.count, 0);

  return (
    <div
      className={styles.miniCurve}
      role="img"
      aria-label={`Mana curve of all cards: ${formatCount(total)}`}
      aria-describedby={descriptionId}
    >
      {bars.map(bar => (
        <div className={styles.miniCurveColumn} key={bar.label} title={bar.text}>
          <span
            className={`${styles.miniCurveBar} ${bar.count > 0 ? '' : styles.miniCurveEmptyBar}`}
            style={{ height: `${(bar.count / maximum) * 100}%` }}
          />
        </div>
      ))}
      <p id={descriptionId} className={styles.visuallyHidden}>
        {bars.map(bar => `${bar.text}.`).join(' ')}
      </p>
    </div>
  );
};

export default MiniManaCurve;
