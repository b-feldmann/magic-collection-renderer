import React from 'react';
import { List, Row, Typography } from 'antd';
import ChangeLogEntryInterface from '../../interfaces/ChangeLogEntryInterface';

import styles from './logEntry.module.scss';
import { ChangeLogFeatureType } from '../../interfaces/enums';

const { Item: ListItem } = List;
const { Text } = Typography;

const LogEntry = (entry: ChangeLogEntryInterface) => {
  const typeColor = (type: ChangeLogFeatureType) => {
    if (type === ChangeLogFeatureType.Removed || type === ChangeLogFeatureType.Deprecated) {
      return styles.delete;
    }
    if (type === ChangeLogFeatureType.Added || type === ChangeLogFeatureType.Fixed) {
      return styles.new;
    }
    if (type === ChangeLogFeatureType.Changed) {
      return styles.change;
    }

    return '';
  };

  return (
    <Row className={styles.entry}>
      <div className={styles.title}>{`${entry.version} — ${entry.title}`}</div>
      <List
        size="small"
        dataSource={entry.content}
        renderItem={item => (
          <ListItem>
            {item.type !== ChangeLogFeatureType.None && (
              <Text code className={typeColor(item.type)}>
                {item.type}
              </Text>
            )}
            <Text>{item.feature}</Text>
          </ListItem>
        )}
      />
    </Row>
  );
};

export default LogEntry;
