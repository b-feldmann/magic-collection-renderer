import React, { useId, useRef, useState } from 'react';
import { Mana } from '../Mana/Mana';
import styles from './styles.module.scss';

interface GuideSymbol {
  name: string;
  code: string;
  symbol: string;
  display?: string;
  loyalty?: number;
}

const COLORS: readonly GuideSymbol[] = [
  { name: 'White', code: '{w}', symbol: 'w' },
  { name: 'Blue', code: '{u}', symbol: 'u' },
  { name: 'Black', code: '{b}', symbol: 'b' },
  { name: 'Red', code: '{r}', symbol: 'r' },
  { name: 'Green', code: '{g}', symbol: 'g' },
  { name: 'Colorless', code: '{c}', symbol: 'c' },
];

const COMMON: readonly GuideSymbol[] = [
  { name: 'Tap', code: '{t}', symbol: 'tap' },
  { name: 'Untap', code: '{ut}', symbol: 'untap' },
  { name: 'Generic mana', code: '{1}', display: '{0} – {20}', symbol: '1' },
  { name: 'Variable mana', code: '{x}', display: '{x}{y}{z}', symbol: 'x' },
];

const ADVANCED = [
  {
    name: 'Two-color hybrid',
    symbols: ['wu', 'wb', 'ub', 'ur', 'br', 'bg', 'rg', 'rw', 'gw', 'gu'],
  },
  { name: 'Two-brid mana', symbols: ['2w', '2u', '2b', '2r', '2g'] },
  { name: 'Phyrexian mana', symbols: ['wp', 'up', 'bp', 'rp', 'gp', 'p'] },
] as const;

const LOYALTY: readonly GuideSymbol[] = [
  { name: 'Gain loyalty', code: '{loy+5}', symbol: 'loyalty-up', loyalty: 5 },
  { name: 'Spend loyalty', code: '{loy-5}', symbol: 'loyalty-down', loyalty: 5 },
  { name: 'Zero loyalty', code: '{loy0}', symbol: 'loyalty-zero', loyalty: 0 },
  { name: 'Starting loyalty', code: '{loy5}', symbol: 'loyalty-start', loyalty: 5 },
];

const MECHANICS = [
  {
    code: '[-MECHANIC]',
    label: 'Reminder only',
    description: 'Only the description, in italic parentheses. No name or cost.',
  },
  {
    code: '[MECHANIC {2}]',
    label: 'Name + cost + reminder',
    description: (
      <>
        The mechanic name, cost, and description. Your cost replaces <code>{'{ref}'}</code> in the
        description; numbers or mana symbols work.
      </>
    ),
  },
  {
    code: '[MECHANIC]',
    label: 'Name + reminder',
    description: (
      <>
        The mechanic name and description, with <code>{'{ref}'}</code> removed.
      </>
    ),
  },
] as const;

function SymbolButton({
  entry,
  onCopy,
  showName = false,
}: {
  entry: GuideSymbol;
  onCopy: (code: string) => void;
  showName?: boolean;
}) {
  return (
    <button
      type="button"
      className={showName ? styles.token : styles.symbol}
      aria-label={`Copy ${entry.name}: ${entry.code}`}
      title={`${entry.name} · Copy ${entry.code}`}
      onClick={() => onCopy(entry.code)}
    >
      <span aria-hidden="true">
        <Mana symbol={entry.symbol} cost={entry.loyalty === undefined} loyalty={entry.loyalty} />
      </span>
      {showName && <span className={styles.symbolName}>{entry.name}</span>}
      <code>{entry.display ?? entry.code}</code>
    </button>
  );
}

const SymbolGuide = ({ onClose }: { onClose: () => void }): React.JSX.Element => {
  const titleId = useId();
  const latestCopy = useRef(0);
  const [copyResult, setCopyResult] = useState<{ code: string; success: boolean } | null>(null);

  const copy = async (code: string) => {
    const request = ++latestCopy.current;
    let success = false;
    try {
      await navigator.clipboard.writeText(code);
      success = true;
    } catch {
      // Clipboard access can be unavailable in Electron or denied by the browser.
    }
    if (request === latestCopy.current) setCopyResult({ code, success });
  };

  return (
    <div className={styles.guide} role="dialog" aria-labelledby={titleId}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 id={titleId}>Symbol guide</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close symbol guide"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p className={styles.intro}>
          A little shorthand. A lot of magic.
          <br />
          Use these codes in your card text and mana cost.
        </p>
      </header>
      <div className={styles.content} tabIndex={0} role="region" aria-label="Symbol codes">
        <section className={styles.section} aria-label="Mana & Actions">
          <div className={styles.sectionHeading}>
            <h3>Mana &amp; Actions</h3>
            <span>01</span>
          </div>
          <div className={styles.manaGrid}>
            {COLORS.map(entry => (
              <SymbolButton key={entry.code} entry={entry} onCopy={copy} />
            ))}
          </div>
          <div className={styles.common}>
            {COMMON.map(entry => (
              <SymbolButton key={entry.code} entry={entry} onCopy={copy} showName />
            ))}
          </div>
          <details className={styles.advanced}>
            <summary>Hybrid &amp; Phyrexian Mana</summary>
            {ADVANCED.map(group => (
              <div key={group.name} className={styles.advancedGroup}>
                <p className={styles.label}>{group.name}</p>
                <div className={styles.advancedGrid}>
                  {group.symbols.map(symbol => (
                    <SymbolButton
                      key={symbol}
                      entry={{ name: group.name, code: `{${symbol}}`, symbol }}
                      onCopy={copy}
                    />
                  ))}
                </div>
              </div>
            ))}
          </details>
        </section>
        <section className={styles.section} aria-label="Loyalty">
          <div className={styles.sectionHeading}>
            <h3>Loyalty</h3>
            <span>02</span>
          </div>
          <div className={styles.loyalty}>
            {LOYALTY.map(entry => (
              <SymbolButton key={entry.code} entry={entry} onCopy={copy} />
            ))}
          </div>
          <p className={styles.hint}>
            Replace <code>5</code> with a number or <code>x</code>, e.g. <code>{'{loy+x}'}</code>,{' '}
            <code>{'{loy-x}'}</code>, <code>{'{loyx}'}</code>.
          </p>
        </section>
        <section className={styles.section} aria-label="Text & Mechanics">
          <div className={styles.sectionHeading}>
            <h3>Text &amp; Mechanics</h3>
            <span>03</span>
          </div>
          <div className={styles.nameTip}>
            <code>~</code>
            <p>
              <strong>Your card’s name, wherever you need it.</strong>
              <br />
              Replaced with the card name when rendered.
            </p>
          </div>
          <div className={styles.mechanics}>
            {MECHANICS.map(mechanic => (
              <div className={styles.mechanic} key={mechanic.code}>
                <div className={styles.mechanicHeading}>
                  <code>{mechanic.code}</code>
                  <span>{mechanic.label}</span>
                </div>
                <p>{mechanic.description}</p>
              </div>
            ))}
          </div>
          <p className={styles.hint}>
            Replace <code>MECHANIC</code> with a mechanic from your collection.
          </p>
        </section>
      </div>
      <footer className={styles.footer}>
        <span className={styles.dot} aria-hidden="true" />
        <span role="status" aria-live="polite" aria-atomic="true">
          {copyResult ? (
            <>
              {copyResult.success ? 'Copied ' : 'Couldn’t copy '}
              <code>{copyResult.code}</code>
              {!copyResult.success && ' — select and copy manually.'}
            </>
          ) : (
            'Click a symbol to copy its code.'
          )}
        </span>
      </footer>
    </div>
  );
};

export default SymbolGuide;
