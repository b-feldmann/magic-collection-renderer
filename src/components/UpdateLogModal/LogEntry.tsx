import React from 'react';
import { Row } from 'antd';
import UpdateLogEntryInterface from '../../interfaces/UpdateLogEntryInterface';

import styles from './logEntry.module.scss';

const LogEntry = (entry: UpdateLogEntryInterface) => {
  return (
    <Row className={styles.entry}>
      <div className={styles.title}>{entry.title}</div>
      {entry.content}
    </Row>
  );
};

export default LogEntry;
