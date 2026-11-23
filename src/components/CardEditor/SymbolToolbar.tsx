import React from 'react';
import { Button } from 'antd';
import { isMobile } from 'react-device-detect';
import { ColorType } from '../../interfaces/enums';
import EditorTooltip from '../EditorTooltip';
import Mana from '../Mana/Mana';
import styles from './styles.module.scss';

type ColoredManaColor = Exclude<ColorType, ColorType.Colorless | ColorType.Gold>;

interface SymbolButton {
  key: string;
  name: string;
  icon: string;
  value: string;
  ariaLabel?: string;
}

const COLORED_MANA_COLORS: ColoredManaColor[] = [
  ColorType.White,
  ColorType.Blue,
  ColorType.Black,
  ColorType.Red,
  ColorType.Green,
];

const MANA_SYMBOLS: Record<ColoredManaColor, string> = {
  [ColorType.White]: 'w',
  [ColorType.Blue]: 'u',
  [ColorType.Black]: 'b',
  [ColorType.Red]: 'r',
  [ColorType.Green]: 'g',
};

const getSymbols = (manaColors: ColorType[] = []): SymbolButton[] => {
  const selectedColors = new Set(manaColors);
  const matchingColors = COLORED_MANA_COLORS.filter(color => selectedColors.has(color));
  const colors: ColoredManaColor[] = matchingColors.length ? matchingColors : [ColorType.Blue];
  const manaSymbols = colors.map(color => ({
    key: `mana-${color}`,
    name: 'Mana',
    icon: MANA_SYMBOLS[color],
    value: `{${MANA_SYMBOLS[color]}}`,
    ariaLabel: colors.length > 1 ? `Mana ${color}` : undefined,
  }));

  return [
    { key: 'tap', name: 'Tap', icon: 'tap', value: '{t}' },
    ...manaSymbols,
    { key: 'generic', name: 'Generic', icon: '1', value: '{1}' },
  ];
};

const TOKEN_REFERENCE_START = '[Token: ';

const Separator = () => (
  <span
    className={`${styles.symbolToolbarDivider} ${styles.symbolToolbarSeparator}`}
    aria-hidden="true"
  />
);

interface ToolbarButtonProps {
  controls?: string;
  label?: string;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}

/** A button that leaves the focus, and with it the caret, in the text. */
export const ToolbarButton = ({
  controls,
  label,
  title,
  onClick,
  children,
}: ToolbarButtonProps) => (
  <Button
    type="text"
    size="small"
    aria-label={label}
    aria-controls={controls}
    title={title}
    onMouseDown={event => event.preventDefault()}
    onClick={onClick}
  >
    {children}
  </Button>
);

interface SymbolToolbarProps {
  name: string;
  // The id of the text the buttons insert into.
  controls?: string;
  manaColors?: ColorType[];
  onInsert: (text: string) => void;
  /** More buttons. */
  children?: React.ReactNode;
}

/** The buttons above rules text, which insert symbols and token references. */
const SymbolToolbar = ({ name, controls, manaColors, onInsert, children }: SymbolToolbarProps) => (
  <div className={styles.textToolbar} role="group" aria-label={`${name} symbols`}>
    {getSymbols(manaColors).map((symbol, index) => (
      <React.Fragment key={symbol.key}>
        {index > 0 && <Separator />}
        <ToolbarButton
          controls={controls}
          label={symbol.ariaLabel}
          onClick={() => onInsert(symbol.value)}
        >
          <span className={styles.toolbarSymbol} aria-hidden="true">
            <Mana symbol={symbol.icon} cost={true} />
          </span>{' '}
          {symbol.name}
        </ToolbarButton>
      </React.Fragment>
    ))}
    <Separator />
    <ToolbarButton
      controls={controls}
      title="Insert a token reference: the card shows the token as written on its token card"
      onClick={() => onInsert(TOKEN_REFERENCE_START)}
    >
      Token
    </ToolbarButton>
    {children && (
      <>
        <Separator />
        {children}
      </>
    )}
    {!isMobile && (
      <>
        <span className={styles.symbolToolbarDivider} aria-hidden="true" />
        <EditorTooltip className={styles.symbolGuide}>
          <Button type="link" size="small">
            Symbol guide <span aria-hidden="true">↗</span>
          </Button>
        </EditorTooltip>
      </>
    )}
  </div>
);

export default SymbolToolbar;
