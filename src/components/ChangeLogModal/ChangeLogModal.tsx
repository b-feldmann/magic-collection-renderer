import React, { useEffect } from 'react';
import { Modal } from 'antd';

import useLocalStorage from '../../utils/useLocalStorageHook';
import updateLog from './updateLog';
import LogEntry from './LogEntry';

const ChangeLogModal = () => {
  const [lastSeenVersion, updateLastSeenVersion] = useLocalStorage(
    'mtg-funset:last-seen-version',
    '-1'
  );

  const renderLog = () => {
    return updateLog
      .filter((log, i) => i > parseInt(lastSeenVersion, 10))
      .map(entry => <LogEntry {...entry} />);
  };

  useEffect(() => {
    if (updateLog.length > 0 && updateLog.length - 1 > parseInt(lastSeenVersion, 10)) {
      Modal.info({
        title: 'Change Log',
        content: renderLog(),
        width: '90%',
        onOk() {
          updateLastSeenVersion(updateLog.length - 1);
        },
        okText: "Thanks for the info!"
      });
    }
  }, [lastSeenVersion]);

  return <div />;
};

export default ChangeLogModal;
