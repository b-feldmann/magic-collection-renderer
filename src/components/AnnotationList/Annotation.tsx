import React, { useContext } from 'react';

import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import Comment from '../Comment/Comment';

dayjs.extend(relativeTime);

import _ from 'lodash';

import AnnotationInterface from '../../interfaces/AnnotationInterface';

import styles from './Annotations.module.scss';
import { Store, StoreType } from '../../store';
import { injectManaIcons } from '../../utils/injectUtils';

interface AnnotationProps {
  annotation: AnnotationInterface;
}

const Annotation = ({ annotation }: AnnotationProps) => {
  const { user } = useContext<StoreType>(Store);

  const datetimeRender = (datetime: number) => (
    <Tooltip title={dayjs(datetime).format('dddd, DD.MM.YYYY HH:mm')}>
      <span>{dayjs(datetime).fromNow()}</span>
    </Tooltip>
  );

  const author = _.find(user, (o) => o.uuid === annotation.author);

  return (
    <Comment
      className={styles.entry}
      author={author ? author.name : annotation.author}
      content={annotation.content.split('\n').map((item, i) => {
        return (
          <span>
            {i > 0 && <br />}
            {injectManaIcons(item)}
          </span>
        );
      })}
      datetime={datetimeRender(annotation.datetime)}
    />
  );
};

export default Annotation;
