import React, { useLayoutEffect, useRef } from 'react';
import { Button, Input } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import EditorTooltip from '../EditorTooltip';
import styles from './styles.module.scss';

interface CardTextInputProps {
  id: string;
  name: string;
  value: string[];
  onChange: (lines: string[]) => void;
}

const SYMBOLS = [
  { name: 'Tap', icon: '↷', value: '{t}' },
  { name: 'Mana', icon: '◈', value: '{u}' },
  { name: 'Generic', icon: '①', value: '{1}' },
];

const CardTextInput = ({ id, name, value, onChange }: CardTextInputProps) => {
  const textareaRef = useRef<TextAreaRef>(null);
  const pendingCaret = useRef<number | null>(null);
  const text = value.join('\n');

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
        <EditorTooltip className={styles.symbolGuide}>
          <Button type="link" size="small">
            Symbol guide <span aria-hidden="true">↗</span>
          </Button>
        </EditorTooltip>
      </div>
      <div className={styles.textToolbar} role="group" aria-label={`${name} symbols`}>
        {SYMBOLS.map(symbol => (
          <Button
            key={symbol.name}
            type="text"
            size="small"
            aria-controls={id}
            onMouseDown={event => event.preventDefault()}
            onClick={() => insertSymbol(symbol.value)}
          >
            <span aria-hidden="true">{symbol.icon}</span> {symbol.name}
          </Button>
        ))}
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
