import React, { useContext, useState } from 'react';

import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import Comment from '../Comment/Comment';

dayjs.extend(relativeTime);

import AnnotationInterface from '../../interfaces/AnnotationInterface';

import styles from './Annotations.module.scss';
import { Store, StoreType } from '../../store';
import { injectManaIcons } from '../../utils/injectUtils';
import AnnotationReactions from './AnnotationReactions';

interface AnnotationProps {
  annotation: AnnotationInterface;
}

const Annotation = ({ annotation }: AnnotationProps) => {
  const { user } = useContext<StoreType>(Store);
  const [active, setActive] = useState(false);

  const datetimeRender = (datetime: number) => (
    <Tooltip title={dayjs(datetime).format('dddd, DD.MM.YYYY HH:mm')}>
      <span>{dayjs(datetime).fromNow()}</span>
    </Tooltip>
  );

  const author = user.find(o => o.uuid === annotation.author);

  return (
    <article
      className={styles.entry}
      tabIndex={0}
      aria-label={`Comment by ${author ? author.name : annotation.author}`}
      data-reactions-visible={active}
      onClick={() => setActive(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(false);
      }}
    >
      <Comment
        author={author ? author.name : annotation.author}
        content={annotation.content.split('\n').map((item, i) => {
          return (
            <span key={i}>
              {i > 0 && <br />}
              {injectManaIcons(item)}
            </span>
          );
        })}
        datetime={datetimeRender(annotation.datetime)}
      >
        <AnnotationReactions annotation={annotation} />
      </Comment>
    </article>
  );
};

export default Annotation;
