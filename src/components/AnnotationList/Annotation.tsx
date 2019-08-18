import React from 'react';

import { Comment, Tooltip, List } from 'antd';
import moment from 'moment';
import AnnotationInterface from '../../interfaces/AnnotationInterface';

import styles from './Annotations.module.scss';

interface AnnotationProps {
  annotation: AnnotationInterface;
}

const Annotation = ({ annotation }: AnnotationProps) => {
  const datetimeRender = (datetime: number) => (
    <Tooltip title={moment(datetime).format('dddd, DD.MM.YYYY HH:mm')}>
      <span>{moment(datetime).fromNow()}</span>
    </Tooltip>
  );

  return (
    <Comment
      className={styles.entry}
      author={annotation.author}
      content={annotation.content.split('\n').map(item => {
        return <p>{item}</p>;
      })}
      datetime={datetimeRender(annotation.datetime)}
    />
  );
};

export default Annotation;
