import React from 'react';
import CardInterface from '../../interfaces/CardInterface';
import { SortType } from '../../interfaces/enums';
import { Col, Row } from 'antd';
import CardRender from '../CardRender/CardRender';

// @ts-ignore
import useResizeAware from 'react-resize-aware';

import styles from './styles.module.css';
import ActionHover from '../ActionHover/ActionHover';
import PdfDownloadWrapper from '../PdfDownloadWrapper/PdfDownloadWrapper';

interface CardCollectionInterface {
  cards?: CardInterface[];
  sortBy: SortType;
  editCard: (id: number) => void;
  downloadImage: (id: number) => void;
  downloadJson: (id: number) => void;
  viewCard: (id: number) => void;
}

const CardCollection: React.FC<CardCollectionInterface> = ({
  cards = [],
  editCard,
  downloadJson,
  viewCard
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
        {cards.map(card => {
          return (
            <Col className={styles.cardBox} span={colSpan} key={card.cardID}>
              <PdfDownloadWrapper
                fileName={card.name}
                render={downloadPdf => (
                  <ActionHover
                    northAction={{
                      icon: 'edit',
                      action: () => editCard(card.cardID)
                    }}
                    eastAction={{
                      icon: 'eye',
                      action: () => viewCard(card.cardID)
                    }}
                    southAction={{
                      icon: 'download',
                      action: downloadPdf
                    }}
                    westAction={{
                      icon: 'file-text',
                      action: () => downloadJson(card.cardID)
                    }}
                  >
                    <CardRender {...card} />
                  </ActionHover>
                )}
              />
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default CardCollection;
