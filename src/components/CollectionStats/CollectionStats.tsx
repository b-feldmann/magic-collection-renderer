import React, { useId, useMemo, useRef, useState } from 'react';
import CardInterface from '../../interfaces/CardInterface';
import ManaCurveChart from './ManaCurveChart';
import MiniManaCurve from './MiniManaCurve';
import ColorCardLists from './ColorCardLists';
import {
  buildColorCardLists,
  buildManaCurveData,
  ChartCategory,
  ChartLayout,
  colorCategories,
  getSharedCountMaximum,
  ManaCurvePoint,
  rarityCategories,
  typeCategories,
} from './collectionStatsData';
import styles from './collectionStats.module.scss';

export { buildManaCurveData } from './collectionStatsData';
export type { ManaCurveData } from './collectionStatsData';

type CurveGroup = {
  title: string;
  section: string;
  data: ManaCurvePoint[];
  categories: ChartCategory[];
  countUnit: 'cards' | 'tag matches';
};
type ClosedState = 'hidden' | 'preview';
const CLOSED_STATE_STORAGE_KEY = 'mtg-funset:CollectionStatsClosedState';

const CurveSection = ({ group, layout }: { group: CurveGroup; layout: ChartLayout }) => {
  const maximum = getSharedCountMaximum(group.data, group.categories, layout);
  return (
    <section className={styles.curveSection} aria-label={`Mana curve by ${group.section}`}>
      <div className={styles.sectionIntro}>
        <div className={styles.sectionHeading}>
          <h2>Mana curve by {group.section}</h2>
          <span>
            Shared scale: 0–{maximum} {group.countUnit} · mana values 0–7+
          </span>
        </div>
        {group.countUnit === 'tag matches' && (
          <p className={styles.sectionNote}>
            Cards can match multiple tags; these counts are tag matches, not unique cards.
          </p>
        )}
      </div>
      <div className={layout === 'individual' ? styles.singleCharts : styles.stackedCharts}>
        {layout === 'individual' && group.categories.length > 0 ? (
          group.categories.map(category => (
            <ManaCurveChart
              key={category.key}
              title={category.label}
              data={group.data}
              categories={[category]}
              maxCount={maximum}
              layout={layout}
              countUnit={group.countUnit}
            />
          ))
        ) : (
          <ManaCurveChart
            title={group.title}
            data={group.data}
            categories={group.categories}
            maxCount={maximum}
            layout={layout}
            countUnit={group.countUnit}
          />
        )}
      </div>
    </section>
  );
};

const CollectionStats = ({
  collection,
  allCards = collection,
  fillHeight = false,
  onStateChange,
}: {
  collection: CardInterface[];
  allCards?: CardInterface[];
  fillHeight?: boolean;
  onStateChange?: (state: 'hidden' | 'preview' | 'expanded') => void;
}) => {
  const data = useMemo(() => buildManaCurveData(collection, allCards), [collection, allCards]);
  const colorLists = useMemo(
    () => buildColorCardLists(collection, allCards),
    [collection, allCards],
  );
  const [closedState, setClosedState] = useState<ClosedState>(() => {
    try {
      return localStorage.getItem(CLOSED_STATE_STORAGE_KEY) === 'hidden' ? 'hidden' : 'preview';
    } catch {
      return 'preview';
    }
  });
  const [expanded, setExpanded] = useState(false);
  const [layout, setLayout] = useState<ChartLayout>('individual');
  const expansionButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const detailsId = useId();
  const isExpanded = fillHeight || expanded;
  const isMostlyHidden = !fillHeight && !expanded && closedState === 'hidden';
  const changeExpanded = (next: boolean) => {
    setExpanded(next);
    if (next) setLayout('individual');
    onStateChange?.(next ? 'expanded' : closedState);
  };
  const chooseClosedState = (next: ClosedState) => {
    setClosedState(next);
    onStateChange?.(next);
    try {
      localStorage.setItem(CLOSED_STATE_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable in restricted browsing contexts.
    }
    setExpanded(false);
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    suppressClick.current = false;
    gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const releaseGesture = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    gesture.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const deltaY = start.y - event.clientY;
    const deltaX = Math.abs(start.x - event.clientX);
    if (cancelled) {
      suppressClick.current = true;
      return;
    }
    if (Math.abs(deltaY) > 35 && Math.abs(deltaY) > deltaX) {
      changeExpanded(deltaY > 0);
      suppressClick.current = true;
    } else if (Math.max(Math.abs(deltaY), deltaX) > 8) {
      // A scroll/short drag is not a click on the expansion control.
      suppressClick.current = true;
    }
  };
  const { summary } = data;
  const activeTypes = typeCategories.filter(
    (category, index) => index < 5 || data.types.some(point => point[category.key] > 0),
  );
  const groups: CurveGroup[] = [
    {
      title: 'Color',
      section: 'color',
      data: data.colors,
      categories: colorCategories,
      countUnit: 'cards',
    },
    {
      title: 'Card type',
      section: 'card type',
      data: data.types,
      categories: activeTypes,
      countUnit: 'cards',
    },
    {
      title: 'Tags',
      section: 'tag',
      data: data.tags,
      categories: data.tagCategories,
      countUnit: 'tag matches',
    },
    {
      title: 'Rarity',
      section: 'rarity',
      data: data.rarities,
      categories: rarityCategories,
      countUnit: 'cards',
    },
  ];
  return (
    <section
      className={`${styles.statsBar} ${fillHeight ? styles.fillHeight : ''} ${isExpanded ? styles.expanded : ''} ${isMostlyHidden ? styles.mostlyHidden : ''}`}
      aria-label="Collection mana curves"
      onKeyDown={event => {
        if (event.key === 'Escape' && expanded && !fillHeight) {
          event.preventDefault();
          changeExpanded(false);
          expansionButton.current?.focus();
        }
      }}
    >
      {!fillHeight && (
        <button
          type="button"
          className={styles.dragHandle}
          aria-label={
            expanded
              ? 'Collapse statistics; drag down to collapse'
              : 'Expand statistics; drag up to expand'
          }
          aria-expanded={expanded}
          aria-controls={detailsId}
          onPointerDown={handlePointerDown}
          onPointerUp={event => releaseGesture(event)}
          onPointerCancel={event => releaseGesture(event, true)}
          onLostPointerCapture={() => {
            gesture.current = null;
          }}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            changeExpanded(!expanded);
          }}
          onKeyDown={event => {
            if (['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
              event.preventDefault();
              suppressClick.current = false;
              changeExpanded(event.key === 'ArrowUp' || (event.key !== 'ArrowDown' && !expanded));
            }
          }}
        >
          <span />
        </button>
      )}
      <header className={`${styles.sheetHeading} ${isMostlyHidden ? styles.hiddenHeading : ''}`}>
        <div className={styles.headingIntro}>
          <h2>Collection statistics</h2>
          {!isExpanded && (
            <>
              <span className={styles.summary}>
                {summary.nonlandCount} nonlands · {summary.landCount}{' '}
                {summary.landCount === 1 ? 'land' : 'lands'}
              </span>
              <span className={styles.inlineMetrics}>
                Average <strong>{summary.averageManaValue.toFixed(2)}</strong> mana ·{' '}
                <strong>{summary.twoToThreePercent}%</strong> at 2–3 mana
              </span>
            </>
          )}
        </div>
        {/* The color curve is the one that counts every card: lands sit at mana value 0. */}
        {isMostlyHidden && <MiniManaCurve data={data.colors} categories={colorCategories} />}
        <div className={styles.headingControls}>
          {isExpanded && (
            <div className={styles.layoutSwitch} role="group" aria-label="Chart layout">
              <button
                type="button"
                aria-pressed={layout === 'stacked'}
                onClick={() => setLayout('stacked')}
              >
                Stacked
              </button>
              <button
                type="button"
                aria-pressed={layout === 'individual'}
                onClick={() => setLayout('individual')}
              >
                Individual
              </button>
            </div>
          )}
          {!isExpanded && !fillHeight && (
            <div
              className={styles.closedStateSwitch}
              role="group"
              aria-label="Preferred closed state"
            >
              <button
                type="button"
                aria-pressed={closedState === 'hidden'}
                onClick={() => chooseClosedState('hidden')}
              >
                Hidden
              </button>
              <button
                type="button"
                aria-pressed={closedState === 'preview'}
                onClick={() => chooseClosedState('preview')}
              >
                Preview
              </button>
            </div>
          )}
          {!fillHeight && (
            <button
              type="button"
              ref={expansionButton}
              className={styles.expandButton}
              aria-expanded={expanded}
              aria-controls={detailsId}
              aria-label={expanded ? 'Collapse statistics' : 'Expand statistics'}
              onClick={() => changeExpanded(!expanded)}
            >
              {expanded ? '↓ Collapse' : '↑ Expand'}
            </button>
          )}
        </div>
      </header>
      <div id={detailsId} hidden={!isExpanded} className={styles.details}>
        {isExpanded && (
          <>
            <div className={styles.metrics}>
              <div>
                <strong>{summary.nonlandCount}</strong>
                <span>
                  Nonland cards · {summary.landCount} {summary.landCount === 1 ? 'land' : 'lands'}
                </span>
              </div>
              <div>
                <strong>{summary.averageManaValue.toFixed(2)}</strong>
                <span>Average nonland mana value</span>
              </div>
              <div>
                <strong>{summary.twoToThreePercent}%</strong>
                <span>
                  Nonlands costing 2–3 mana · {summary.twoToThreeCount} of {summary.nonlandCount}
                </span>
              </div>
            </div>
            <div className={layout === 'stacked' ? styles.stackedSections : undefined}>
              {groups.map(group => (
                <CurveSection key={group.section} group={group} layout={layout} />
              ))}
            </div>
            <p className={styles.sectionNote}>
              Lands count as 0 mana in the color curves; other curves and summary statistics exclude
              lands. Multicolor cards are counted only in Multicolor. Card types use one primary
              classification per card, with Creature taking precedence.
            </p>
            <ColorCardLists lists={colorLists} />
          </>
        )}
      </div>
      {!isExpanded && !isMostlyHidden && (
        <div
          className={styles.previewCharts}
          tabIndex={0}
          role="group"
          aria-label="Statistics previews"
        >
          {groups.slice(0, 3).map(group => (
            <ManaCurveChart
              key={group.section}
              compact
              className={group.section === 'tag' ? styles.previewTagChart : undefined}
              title={group.title}
              data={group.data}
              categories={group.categories}
              layout="stacked"
              maxCount={getSharedCountMaximum(group.data, group.categories, 'stacked')}
              countUnit={group.countUnit}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CollectionStats;
