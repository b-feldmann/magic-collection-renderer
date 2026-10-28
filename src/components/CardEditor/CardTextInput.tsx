import React, { useLayoutEffect, useRef } from 'react';
import { Button, Input } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { isMobile } from 'react-device-detect';
import { ColorType } from '../../interfaces/enums';
import EditorTooltip from '../EditorTooltip';
import Mana from '../Mana/Mana';
import styles from './styles.module.scss';

interface CardTextInputProps {
  id: string;
  name: string;
  value: string[];
  onChange: (lines: string[]) => void;
  manaColors?: ColorType[];
}

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

const CardTextInput = ({ id, name, value, onChange, manaColors }: CardTextInputProps) => {
  const textareaRef = useRef<TextAreaRef>(null);
  const pendingCaret = useRef<number | null>(null);
  const text = value.join('\n');
  const symbols = getSymbols(manaColors);

  // Apply once after a controlled update, including replacing a symbol with
  // itself (where the text is unchanged but the selection must still collapse).
  useLayoutEffect(() => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea || pendingCaret.current === null) return;
    textarea.focus();
    textarea.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  const insertSymbol = (symbol: string) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    pendingCaret.current = selectionStart + symbol.length;
    onChange((text.slice(0, selectionStart) + symbol + text.slice(selectionEnd)).split('\n'));
  };

  return (
    <span>
      <div className={styles.rulesLabelRow}>
        <label className={styles.label} htmlFor={id}>
          {name}
        </label>
      </div>
      <div className={styles.textToolbar} role="group" aria-label={`${name} symbols`}>
        {symbols.map((symbol, index) => (
          <React.Fragment key={symbol.name}>
            {index > 0 && (
              <span
                className={`${styles.symbolToolbarDivider} ${styles.symbolToolbarSeparator}`}
                aria-hidden="true"
              />
            )}
            <Button
              type="text"
              size="small"
              aria-label={symbol.ariaLabel}
              aria-controls={id}
              onMouseDown={event => event.preventDefault()}
              onClick={() => insertSymbol(symbol.value)}
            >
              <span className={styles.toolbarSymbol} aria-hidden="true">
                <Mana symbol={symbol.icon} cost={true} />
              </span>{' '}
              {symbol.name}
            </Button>
          </React.Fragment>
        ))}
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
      <Input.TextArea
        ref={textareaRef}
        id={id}
        className={styles.rulesTextArea}
        value={text}
        onChange={event => onChange(event.target.value.split('\n'))}
        autoSize={{ minRows: 2 }}
      />
    </span>
  );
};

export default CardTextInput;
