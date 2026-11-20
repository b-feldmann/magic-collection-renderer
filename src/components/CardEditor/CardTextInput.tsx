import React, { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Input } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { isMobile } from 'react-device-detect';
import { ColorType } from '../../interfaces/enums';
import { TokenCardsContext } from '../../store';
import { findOpenTokenReference } from '../../utils/tokenReferences';
import EditorTooltip from '../EditorTooltip';
import Mana from '../Mana/Mana';
import TokenReferenceOptions, {
  getTokenReferenceOptions,
  TokenReferenceOption,
  tokenReferenceOptionId,
} from './TokenReferenceOptions';
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

const TOKEN_REFERENCE_START = '[Token: ';

const CardTextInput = ({ id, name, value, onChange, manaColors }: CardTextInputProps) => {
  const textareaRef = useRef<TextAreaRef>(null);
  const pendingCaret = useRef<number | null>(null);
  const text = value.join('\n');
  const symbols = getSymbols(manaColors);
  const tokenCards = useContext(TokenCardsContext);
  const listId = `${id}-token-cards`;

  // The caret while the text has focus, for the token reference autocomplete.
  const [caret, setCaret] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // The start of the reference whose list was closed with Escape.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const openReference = caret === null ? null : findOpenTokenReference(text, caret);
  const options = useMemo(
    () => (openReference ? getTokenReferenceOptions(openReference.query, tokenCards) : []),
    [openReference?.query, tokenCards], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const listOpen = !!openReference && options.length > 0 && dismissedAt !== openReference.start;
  const active = Math.min(activeIndex, options.length - 1);

  // Apply once after a controlled update, including replacing a symbol with
  // itself (where the text is unchanged but the selection must still collapse).
  useLayoutEffect(() => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea || pendingCaret.current === null) return;
    textarea.focus();
    textarea.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  const replaceText = (start: number, end: number, insert: string) => {
    pendingCaret.current = start + insert.length;
    setCaret(start + insert.length);
    setActiveIndex(0);
    onChange((text.slice(0, start) + insert + text.slice(end)).split('\n'));
  };

  const insertSymbol = (symbol: string) => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    replaceText(selectionStart, selectionEnd, symbol);
  };

  const selectOption = (option: TokenReferenceOption) => {
    if (!openReference) return;
    replaceText(openReference.start, openReference.end, `[Token: ${option.reference}]`);
  };

  const updateCaret = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd } = event.currentTarget;
    setCaret(selectionStart === selectionEnd ? selectionStart : null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!listOpen) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((active + step + options.length) % options.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      selectOption(options[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setDismissedAt(openReference!.start);
    }
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
          <React.Fragment key={symbol.key}>
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
        <span
          className={`${styles.symbolToolbarDivider} ${styles.symbolToolbarSeparator}`}
          aria-hidden="true"
        />
        <Button
          type="text"
          size="small"
          aria-controls={id}
          title="Insert a token reference: the card shows the token as written on its token card"
          onMouseDown={event => event.preventDefault()}
          onClick={() => insertSymbol(TOKEN_REFERENCE_START)}
        >
          Token
        </Button>
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
      <div className={styles.rulesTextField}>
        <Input.TextArea
          ref={textareaRef}
          id={id}
          className={styles.rulesTextArea}
          value={text}
          aria-autocomplete="list"
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={listOpen ? tokenReferenceOptionId(listId, active) : undefined}
          onChange={event => {
            updateCaret(event);
            onChange(event.target.value.split('\n'));
          }}
          onSelect={updateCaret}
          onKeyDown={onKeyDown}
          onBlur={() => setCaret(null)}
          autoSize={{ minRows: 2 }}
        />
        {listOpen && (
          <TokenReferenceOptions
            id={listId}
            options={options}
            activeIndex={active}
            onSelect={selectOption}
          />
        )}
      </div>
    </span>
  );
};

export default CardTextInput;
