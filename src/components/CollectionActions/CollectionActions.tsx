import React, { useId } from 'react';
import Button from 'antd/es/button';
import Dropdown from 'antd/es/dropdown';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import EllipsisOutlined from '@ant-design/icons/EllipsisOutlined';
import SwapOutlined from '@ant-design/icons/SwapOutlined';
import UserInterface from '../../interfaces/UserInterface';
import styles from './styles.module.scss';

interface CollectionActionsProps {
  currentUser: UserInterface;
  users: UserInterface[];
  onCreate: () => void;
  onEditMechanics: () => void;
  onSwitchUser: (user: UserInterface) => void;
  onReload: () => void;
  onDownload?: () => void;
  mobile?: boolean;
}

const CollectionActions = ({
  currentUser,
  users,
  onCreate,
  onEditMechanics,
  onSwitchUser,
  onReload,
  onDownload,
  mobile = false,
}: CollectionActionsProps) => {
  const userId = useId();
  const availableUsers = users.filter(user => user.name !== 'ADMIN');
  const items = [
    ...(onDownload
      ? [{ key: 'json', label: 'Download JSON', icon: <DownloadOutlined />, onClick: onDownload }]
      : []),
    { key: 'reload', label: 'Reload collection', icon: <ReloadOutlined />, onClick: onReload },
  ];

  return (
    <div
      className={`${styles.actions} ${mobile ? styles.mobile : ''}`}
      role="group"
      aria-label="Collection actions"
    >
      <Button
        className={styles.createButton}
        type="primary"
        icon={<PlusOutlined />}
        aria-label="Create card"
        onClick={onCreate}
      >
        Create card
      </Button>
      <Button
        className={styles.mechanicsButton}
        icon={<EditOutlined />}
        aria-label="Edit mechanics"
        onClick={onEditMechanics}
      >
        Edit mechanics
      </Button>
      <div className={styles.accountRow}>
        <span className={styles.userAvatar} aria-hidden="true">
          {currentUser.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase()}
        </span>
        <div className={styles.userPicker}>
          <label htmlFor={userId}>Current user</label>
          <Select
            id={userId}
            className={styles.userSelect}
            aria-label="Switch current user"
            title={currentUser.name}
            value={currentUser.uuid}
            onChange={(uuid: string) => {
              const nextUser = availableUsers.find(user => user.uuid === uuid);
              if (!nextUser || nextUser.uuid === currentUser.uuid) return;
              Modal.confirm({
                title: 'Switch user?',
                content: `You’ll switch the active collection to ${nextUser.name}.`,
                icon: <SwapOutlined />,
                className: styles.switchUserModal,
                okText: 'Yes, switch user',
                cancelText: 'Cancel',
                onOk: () => onSwitchUser(nextUser),
              });
            }}
            options={[
              ...(!availableUsers.some(user => user.uuid === currentUser.uuid)
                ? [{ value: currentUser.uuid, label: currentUser.name }]
                : []),
              ...availableUsers.map(user => ({ value: user.uuid, label: user.name })),
            ]}
          />
        </div>
        <Dropdown trigger={['click']} menu={{ items }}>
          <Button
            type="text"
            className={styles.moreActions}
            aria-label="More collection actions"
            icon={<EllipsisOutlined />}
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default CollectionActions;
