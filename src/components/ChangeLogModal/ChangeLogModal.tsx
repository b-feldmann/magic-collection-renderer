import React, { useContext, useEffect } from 'react';
import { App } from 'antd';

import styles from './logEntry.module.scss';

import updateLog from './updateLog';
import LogEntry from './LogEntry';
import { Store, StoreType } from '../../store';
import { addLastSeenVersion } from '../../actions/userActions';
import { UNKNOWN_CREATOR } from '../../utils/constants';

const ChangeLogModal = () => {
  const { currentUser, dispatch } = useContext<StoreType>(Store);
  const { modal } = App.useApp();

  const renderLog = () => {
    return updateLog
      .filter((log, i) => i > currentUser.lastSeenVersion)
      .map((entry) => <LogEntry {...entry} />);
  };

  useEffect(() => {
    if (
      currentUser.uuid !== UNKNOWN_CREATOR.uuid &&
      updateLog.length > 0 &&
      updateLog.length - 1 > currentUser.lastSeenVersion
    ) {
      modal.info({
        title: 'Change Log',
        content: renderLog(),
        width: '90%',
        className: styles.modal,
        // App.module.scss uses z-index 99999 for the login wrapper and
        // landscape reminders; the modal must paint above all of them.
        zIndex: 100000,
        onOk() {
          addLastSeenVersion(dispatch, updateLog.length - 1, currentUser);
        },
        okText: 'Thanks for the info!',
      });
    }
    // Only re-evaluate when the identity-relevant fields change, not on every
    // unrelated mutation of the `currentUser` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.uuid, currentUser.lastSeenVersion]);

  return <div />;
};

export default ChangeLogModal;
