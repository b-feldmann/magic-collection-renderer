import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  HISTORY_PUSH_TAG,
  RangeSelection,
  TextNode,
} from 'lexical';
import { $createGoogleEmojiNode, GoogleEmojiNode } from './GoogleEmojiNode';
import { findGoogleEmoji } from './googleEmojiData';
import styles from './Annotations.module.scss';

export interface EmojiCommentInputHandle {
  insertEmoji: (emoji: string) => void;
}

interface EmojiCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  ref?: React.Ref<EmojiCommentInputHandle>;
}

const EXTERNAL_VALUE_TAG = 'comment-external-value';

const $replaceText = (value: string) => {
  const paragraph = $createParagraphNode();
  value.split('\n').forEach((line, index) => {
    if (index) paragraph.append($createLineBreakNode());
    if (line) paragraph.append($createTextNode(line));
  });
  $getRoot().clear().append(paragraph);
};

const InputBridge = ({ value, onChange, ref }: EmojiCommentInputProps) => {
  const [editor] = useLexicalComposerContext();
  const currentValue = useRef(value);
  const savedSelection = useRef<RangeSelection | null>(null);

  useEffect(
    () =>
      editor.registerNodeTransform(TextNode, node => {
        if (!node.isSimpleText() || node.isComposing() || editor.isComposing()) return;
        const match = findGoogleEmoji(node.getTextContent());
        if (!match) return;
        const parts = node.splitText(match.index, match.index + match[0].length);
        const emoji = parts[match.index === 0 ? 0 : 1];
        emoji.replace($createGoogleEmojiNode(match[0]));
      }),
    [editor],
  );

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState, tags }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) savedSelection.current = selection.clone();
          const text = $getRoot().getTextContent();
          if (text === currentValue.current) return;
          currentValue.current = text;
          if (!tags.has(EXTERNAL_VALUE_TAG)) onChange(text);
        });
      }),
    [editor, onChange],
  );

  useEffect(() => {
    if (value === currentValue.current) return;
    currentValue.current = value;
    savedSelection.current = null;
    editor.update(() => $replaceText(value), { tag: EXTERNAL_VALUE_TAG });
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  }, [editor, value]);

  useImperativeHandle(
    ref,
    () => ({
      insertEmoji(emoji) {
        const remembered = savedSelection.current?.clone();
        editor.getRootElement()?.focus({ preventScroll: true });
        editor.focus(() => {
          editor.update(
            () => {
              if (remembered) $setSelection(remembered);
              if (!$isRangeSelection($getSelection())) $getRoot().selectEnd();
              const selection = $getSelection();
              if ($isRangeSelection(selection)) selection.insertText(emoji);
            },
            { tag: HISTORY_PUSH_TAG, discrete: true },
          );
        });
      },
    }),
    [editor],
  );

  return null;
};

const EmojiCommentInput = ({ value, onChange, ref }: EmojiCommentInputProps) => {
  const [initialConfig] = useState(() => ({
    namespace: 'comment-input',
    nodes: [GoogleEmojiNode],
    editorState: () => $replaceText(value),
    onError: (error: Error) => {
      throw error;
    },
  }));

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={styles.commentInputWrapper}>
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={styles.commentInput}
              aria-label="Your comment"
              aria-multiline="true"
              aria-placeholder="Your comment"
              placeholder={<span className={styles.commentInputPlaceholder}>Your comment</span>}
              spellCheck
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <InputBridge value={value} onChange={onChange} ref={ref} />
    </LexicalComposer>
  );
};

export default EmojiCommentInput;
