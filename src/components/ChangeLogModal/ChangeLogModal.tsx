import React, { useContext, useEffect } from 'react';
import { Modal } from 'antd';

import styles from './logEntry.module.scss';

import updateLog from './updateLog';
import LogEntry from './LogEntry';
import { Store, StoreType } from '../../store';
import { addLastSeenVersion } from '../../actions/userActions';
import { UNKNOWN_CREATOR } from '../../utils/constants';

const ChangeLogModal = () => {
  const { currentUser, dispatch } = useContext<StoreType>(Store);

  const renderLog = () => {
    return updateLog
      .filter((log, i) => i > currentUser.lastSeenVersion)
      .map(entry => <LogEntry {...entry} />);
  };

  useEffect(() => {
    if (
      currentUser.uuid !== UNKNOWN_CREATOR.uuid &&
      updateLog.length > 0 &&
      updateLog.length - 1 > currentUser.lastSeenVersion
    ) {
      Modal.info({
        title: 'Change Log',
        content: renderLog(),
        width: '90%',
        className: styles.modal,
        onOk() {
          addLastSeenVersion(dispatch, updateLog.length - 1, currentUser);
        },
        okText: 'Thanks for the info!'
      });
    }
  }, [currentUser]);

  return <div />;
};

export default ChangeLogModal;
