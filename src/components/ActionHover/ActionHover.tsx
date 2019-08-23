import React from 'react';

import { Icon } from 'antd';
import styles from './styles.module.scss';

interface ActionHoverInterface {
  northAction?: { icon: string; action: () => void };
  southAction?: { icon: string; action: () => void };
  eastAction?: { icon: string; action: () => void };
  westAction?: { icon: string; action: () => void };
  active?: boolean;
  onHover?: () => void;
}

const ActionHover: React.FC<ActionHoverInterface> = actions => {
  const { northAction, eastAction, westAction, southAction, active, onHover = () => {} } = actions;

  return (
    <div
      className={`${styles.outer} ${active ? styles.active : ''}`}
      onMouseEnter={() => onHover()}
    >
      <div className={styles.hovereffect}>
        <div className={styles.target}>{actions.children}</div>
        <div className={styles.overlay}>
          {eastAction && (
            <Icon
              className={`${styles.action} ${styles.eastAction}`}
              type={eastAction.icon}
              onClick={eastAction.action}
            />
          )}
          {northAction && (
            <Icon
              className={`${styles.action} ${styles.northAction}`}
              type={northAction.icon}
              onClick={northAction.action}
            />
          )}
          {westAction && (
            <Icon
              className={`${styles.action} ${styles.westAction}`}
              type={westAction.icon}
              onClick={westAction.action}
            />
          )}
          {southAction && (
            <Icon
              className={`${styles.action} ${styles.southAction}`}
              type={southAction.icon}
              onClick={southAction.action}
            />
          )}
          <div className={styles.rotate}>
            <hr />
            <hr />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionHover;
