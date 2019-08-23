import React, { useContext } from 'react';

import { Comment, Tooltip, List } from 'antd';
import moment from 'moment';

import _ from 'lodash';

import AnnotationInterface from '../../interfaces/AnnotationInterface';

import styles from './Annotations.module.scss';
import { Store, StoreType } from '../../store';

interface AnnotationProps {
  annotation: AnnotationInterface;
}

const Annotation = ({ annotation }: AnnotationProps) => {
  const { user } = useContext<StoreType>(Store);

  const datetimeRender = (datetime: number) => (
    <Tooltip title={moment(datetime).format('dddd, DD.MM.YYYY HH:mm')}>
      <span>{moment(datetime).fromNow()}</span>
    </Tooltip>
  );

  const author = _.find(user, o => o.uuid === annotation.author);

  return (
    <Comment
      className={styles.entry}
      author={author ? author.name : annotation.author}
      content={annotation.content.split('\n').map(item => {
        return <p>{item}</p>;
      })}
      datetime={datetimeRender(annotation.datetime)}
    />
  );
};

export default Annotation;
