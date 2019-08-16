import React, { useContext, useEffect } from 'react';
import { Modal } from 'antd';

import useLocalStorage from '../../utils/useLocalStorageHook';
import updateLog from './updateLog';
import LogEntry from './LogEntry';

const UpdateLogModal = () => {
  const [lastSeenVersion, updateLastSeenVersion] = useLocalStorage(
    'mtg-funset:last-seen-version',
    '0'
  );

  const renderLog = () => {
    return updateLog
      .filter(log => log.version > parseInt(lastSeenVersion, 10))
      .map(entry => <LogEntry {...entry} />);
  };

  useEffect(() => {
    if (updateLog.length > 0 && updateLog[updateLog.length - 1].version > parseInt(lastSeenVersion, 10)) {
      Modal.info({
        title: 'Update Log',
        content: renderLog(),
        width: '90%',
        onOk() {
          updateLastSeenVersion(updateLog[updateLog.length - 1].version);
        }
      });
    }
  }, [lastSeenVersion]);

  return <div />;
};

export default UpdateLogModal;
