import React from 'react';
import AnnotationInterface from '../../interfaces/AnnotationInterface';
import Annotation from './Annotation';

interface AnnotationListProps {
  annotations: AnnotationInterface[];
}

const AnnotationList = ({ annotations }: AnnotationListProps) => {
  return annotations.map(anno => <Annotation annotation={anno} />);
};

export default AnnotationList;
