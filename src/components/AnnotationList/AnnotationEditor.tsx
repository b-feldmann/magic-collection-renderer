import React, { useContext, useEffect, useState } from 'react';
import { Button, Input, Popover } from 'antd';

import 'emoji-mart/css/emoji-mart.css';
import data from 'emoji-mart/data/apple.json';
import { BaseEmoji, Emoji, NimblePicker as Picker } from 'emoji-mart';

import styles from './Annotations.module.scss';
import { UNKNOWN_CREATOR } from '../../interfaces/constants';
import UserInterface from '../../interfaces/UserInterface';
import { Store, StoreType } from '../../store';

const { TextArea } = Input;

interface AnnotationEditorProps {
  defaultContent?: string;
  defaultAuthor?: UserInterface;
  submitting: boolean;
  onSubmit: (content: string, author: UserInterface) => void;
}

const AnnotationEditor = ({
  onSubmit,
  submitting,
  defaultContent = '',
  defaultAuthor
}: AnnotationEditorProps) => {
  const { currentUser } = useContext<StoreType>(Store);

  const [content, setContent] = useState(defaultContent);
  const [author, setAuthor] = useState(defaultAuthor || currentUser || UNKNOWN_CREATOR);

  useEffect(() => {
    if (!submitting) {
      setContent('');
    }
  }, [submitting]);
  useEffect(() => setContent(defaultContent), [defaultContent]);
  useEffect(() => setAuthor(defaultAuthor || currentUser || UNKNOWN_CREATOR), [
    defaultAuthor,
    currentUser
  ]);

  const onEmoji = (emoji: BaseEmoji) => {
    setContent(content + emoji.native);
  };

  return (
    <div className={styles.editor}>
      <h3>{`Author: ${author.name}`}</h3>
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
      <TextArea
        autosize={{ minRows: 2, maxRows: 5 }}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Your comment"
      />
      <Popover
        content={<Picker onClick={onEmoji} data={data} showSkinTones={false} showPreview={false} />}
      >
        <div>
          <Emoji emoji="smiley" set="apple" size={16} />
        </div>
      </Popover>
      <Button
        className={styles.button}
        htmlType="submit"
        loading={submitting}
        onClick={() => onSubmit(content, author)}
        type="primary"
      >
        Add Comment
      </Button>
    </div>
  );
};

export default AnnotationEditor;
