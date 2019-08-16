import React from 'react';

import { Comment, Tooltip, List } from 'antd';
import moment from 'moment';
import AnnotationInterface from '../../interfaces/AnnotationInterface';

interface AnnotationProps {
  annotation: AnnotationInterface;
}

const Annotation = ({ annotation }: AnnotationProps) => {
  const datetimeRender = (datetime: string) => (
    <Tooltip title={moment(datetime).format('DD.MM.YYYY HH:mm')}>
      <span>
        {moment()
          .subtract(datetime)
          .fromNow()}
      </span>
    </Tooltip>
  );

  return (
    <Comment
      author={annotation.author}
      content={annotation.content}
      datetime={datetimeRender(annotation.datetime)}
    />
  );
};

export default Annotation;
