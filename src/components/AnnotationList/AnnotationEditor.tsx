import React, { useEffect, useState } from 'react';
import { Button, Form, Input, Select } from 'antd';
import { Creators } from '../../interfaces/enums';

import styles from './Annotations.module.scss';

const { TextArea } = Input;

interface AnnotationEditorProps {
  defaultContent?: string;
  defaultAuthor?: Creators;
  submitting: boolean;
  onSubmit: (content: string, author: Creators) => void;
}

const AnnotationEditor = ({
  onSubmit,
  submitting,
  defaultContent = '',
  defaultAuthor = Creators.UNKNOWN
}: AnnotationEditorProps) => {
  const [content, setContent] = useState(defaultContent);
  const [author, setAuthor] = useState(defaultAuthor);

  useEffect(() => {
    if (!submitting) {
      setContent('');
    }
  }, [submitting]);
  useEffect(() => setContent(defaultContent), [defaultContent]);
  useEffect(() => setAuthor(defaultAuthor), [defaultAuthor]);

  return (
    <div className={styles.editor}>
      <Select
        size="small"
        value={author}
        onChange={(newAuthor: Creators) => setAuthor(newAuthor)}
        className={styles.fullWidth}
      >
        {Object.values(Creators).map(d => (
          <Select.Option key={`annotation-add-key-author-${d}`} value={d}>
            {d}
          </Select.Option>
        ))}
      </Select>
      <TextArea
        autosize={{ minRows: 2, maxRows: 5 }}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Your comment"
      />
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
