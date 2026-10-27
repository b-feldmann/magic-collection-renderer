import React, { useContext, useRef, useState } from 'react';
import { Button, Popover } from 'antd';

import EmojiIcon from '../EmojiIcon';
import EmojiPicker from './AnnotationEmojiPicker';
import EmojiCommentInput, { EmojiCommentInputHandle } from './EmojiCommentInput';

import styles from './Annotations.module.scss';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import UserInterface from '../../interfaces/UserInterface';
import { Store, StoreType } from '../../store';

interface AnnotationEditorProps {
  defaultContent?: string;
  defaultAuthor?: UserInterface;
  submitting: boolean;
  onSubmit: (content: string, author: UserInterface) => Promise<boolean>;
}

const AnnotationEditor = ({
  onSubmit,
  submitting,
  defaultContent = '',
  defaultAuthor,
}: AnnotationEditorProps) => {
  const { currentUser } = useContext<StoreType>(Store);

  const [content, setContent] = useState(defaultContent);
  const [pickerOpen, setPickerOpen] = useState(false);
  const input = useRef<EmojiCommentInputHandle>(null);
  // `author` is fully derived from props/context (never edited in the UI), so
  // compute it during render instead of mirroring it into state via an effect.
  const author = defaultAuthor || currentUser || UNKNOWN_CREATOR;

  const handleSubmit = async () => {
    if (await onSubmit(content, author)) {
      setContent(current => (current === content ? '' : current));
    }
  };

  const onEmoji = (emoji: { native: string }) => {
    input.current?.insertEmoji(emoji.native);
    setPickerOpen(false);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <span>Leave a comment</span>
        <span className={styles.editorAuthor}>{`Author: ${author.name}`}</span>
      </div>
      {/* <Select */}
      {/*  size="small" */}
      {/*  value={author.uuid} */}
      {/*  onChange={(uuid: string) => */}
      {/*    setAuthor(_.find(user, o => o.uuid === uuid) || UNKNOWN_CREATOR) */}
      {/*  } */}
      {/*  className={styles.fullWidth} */}
      {/* > */}
      {/*  {user.map(d => ( */}
      {/*    <Select.Option key={`annotation-add-key-author-${d.uuid}`} value={d.uuid}> */}
      {/*      {d.name} */}
      {/*    </Select.Option> */}
      {/*  ))} */}
      {/* </Select> */}
      <EmojiCommentInput ref={input} value={content} onChange={setContent} />
      <div className={styles.editorActions}>
        <Popover
          classNames={{ root: styles.emojiPopover }}
          trigger="click"
          placement="left"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          content={<EmojiPicker onEmojiSelect={onEmoji} />}
        >
          <button
            type="button"
            className={styles.editorEmoji}
            aria-label="Add emoji to comment"
            aria-expanded={pickerOpen}
          >
            <EmojiIcon size={16} />
          </button>
        </Popover>
        <Button
          className={styles.button}
          htmlType="submit"
          loading={submitting}
          onClick={handleSubmit}
          type="primary"
        >
          Add Comment
        </Button>
      </div>
    </div>
  );
};

export default AnnotationEditor;
