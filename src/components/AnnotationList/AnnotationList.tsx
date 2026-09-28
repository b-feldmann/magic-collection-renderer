import React, { useEffect, useState } from 'react';
import { Listy } from 'antd';

import Comment from '../Comment/Comment';

import sortBy from 'lodash/sortBy';

import AnnotationInterface from '../../interfaces/AnnotationInterface';
import Annotation from './Annotation';
import AnnotationEditor from './AnnotationEditor';

import styles from './Annotations.module.scss';
import UserInterface from '../../interfaces/UserInterface';

interface AnnotationListProps {
  annotations: AnnotationInterface[];
  createAnnotation: (content: string, author: UserInterface) => void;
  split?: boolean;
  children?: JSX.Element | string;
}

const AnnotationList = ({
  annotations,
  createAnnotation,
  split,
  children,
}: AnnotationListProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (content: string, author: UserInterface) => {
    setIsSubmitting(true);
    createAnnotation(content, author);
  };

  useEffect(() => setIsSubmitting(false), [annotations]);

  return (
    <div className={styles.container} style={{ flexDirection: split ? 'row-reverse' : 'column' }}>
      <div className={split ? styles.flexWrapper : ''}>{children}</div>
      <div className={styles.flexWrapper}>
        {/* `List` is deprecated in antd 6; `Listy` has no `header`, so it is
            rendered separately above the list. */}
        <div className={styles.list}>
          <div className={styles.listHeader}>{`${annotations.length} annotations`}</div>
          <Listy<AnnotationInterface>
            rowKey="uuid"
            items={sortBy(annotations, (o: AnnotationInterface) => o.datetime)}
            itemRender={(item) => <Annotation annotation={item} />}
          />
        </div>
      </div>
      <div className={split ? styles.flexWrapper : ''}>
        <Comment
          className={styles.entry}
          content={<AnnotationEditor onSubmit={handleSubmit} submitting={isSubmitting} />}
        />
      </div>
    </div>
  );
};

export default AnnotationList;
