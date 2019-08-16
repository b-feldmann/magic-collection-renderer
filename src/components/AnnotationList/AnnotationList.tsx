import React, { useEffect, useState } from 'react';
import { List, Comment } from 'antd';
import AnnotationInterface from '../../interfaces/AnnotationInterface';
import Annotation from './Annotation';
import AnnotationEditor from './AnnotationEditor';
import { Creators } from '../../interfaces/enums';

interface AnnotationListProps {
  annotations: AnnotationInterface[];
}

const AnnotationList = ({ annotations }: AnnotationListProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (content: string, author: Creators) => {
    console.log(content, author);

    setIsSubmitting(true);
  };

  useEffect(() => setIsSubmitting(false), [annotations]);

  return (
    <List
      className="comment-list"
      header={`${annotations.length} replies`}
      itemLayout="horizontal"
      dataSource={annotations}
      renderItem={item => <Annotation annotation={item} />}
      footer={
        <Comment content={<AnnotationEditor onSubmit={handleSubmit} submitting={isSubmitting} />} />
      }
    />
  );
};

export default AnnotationList;
