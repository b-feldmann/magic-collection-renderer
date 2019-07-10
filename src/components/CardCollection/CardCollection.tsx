import React from 'react';
import CardInterface from '../../interfaces/CardInterface';
import { SortType } from '../../interfaces/enums';
import { Col, Row } from 'antd';
import CardRender from '../CardRender/CardRender';

// @ts-ignore
import useResizeAware from 'react-resize-aware';

import styles from './styles.module.css';

interface CardCollectionInterface {
  cards?: CardInterface[];
  sortBy: SortType;
}

const CardCollection: React.FC<CardCollectionInterface> = ({
  cards = []
}: CardCollectionInterface) => {
  const [resizeListener, sizes] = useResizeAware();

  let colSpan = 4;
  if (sizes.width < 1600) colSpan = 6;
  if (sizes.width < 1200) colSpan = 8;
  if (sizes.width < 800) colSpan = 12;

  return (
    <div>
      {resizeListener}
      <Row>
        {cards.map(card => (
          <Col className={styles.cardBox} span={colSpan} key={card.cardIndex}>
            <CardRender {...card} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default CardCollection;
