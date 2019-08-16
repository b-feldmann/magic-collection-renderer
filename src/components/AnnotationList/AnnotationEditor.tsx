import React, { useEffect, useState } from 'react';
import { Button, Form, Input, Select } from 'antd';
import { Creators } from '../../interfaces/enums';

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
      setAuthor(Creators.UNKNOWN);
      setContent('');
    }
  }, [submitting]);
  useEffect(() => setContent(defaultContent), [defaultContent]);
  useEffect(() => setAuthor(defaultAuthor), [defaultAuthor]);

  return (
    <div>
      <Form.Item>
        <Select
          size="small"
          value={author}
          onChange={(newAuthor: Creators) => setAuthor(newAuthor)}
        >
          {Object.values(Creators).map(d => (
            <Select.Option key={`annotation-add-key-author-${d}`} value={d}>
              {d}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item>
        <TextArea rows={4} value={content} onChange={e => setContent(e.target.value)} />
      </Form.Item>
      <Form.Item>
        <Button
          htmlType="submit"
          loading={submitting}
          onClick={() => onSubmit(content, author)}
          type="primary"
        >
          Add Comment
        </Button>
      </Form.Item>
    </div>
  );
};

export default AnnotationEditor;
