import React from 'react';

import styles from './styles.module.scss';
import { Icon } from 'antd';

interface ActionHoverInterface {
  northAction?: { icon: string; action: () => void };
  southAction?: { icon: string; action: () => void };
  eastAction?: { icon: string; action: () => void };
  westAction?: { icon: string; action: () => void };
  active?: boolean;
}

const ActionHover: React.FC<ActionHoverInterface> = actions => {
  const empty = { icon: '', action: () => {} };
  const {
    northAction = empty,
    eastAction = empty,
    westAction = empty,
    southAction = empty,
    active
  } = actions;

  return (
    <div className={`${styles.outer} ${active ? styles.active : ''}`}>
      <div className={styles.hovereffect}>
        <div className={styles.target}>{actions.children}</div>
        <div className={styles.overlay}>
          {/*<h2>Hover Me</h2>*/}
          <Icon
            className={`${styles.action} ${styles.eastAction}`}
            type={eastAction.icon}
            onClick={eastAction.action}
          />
          <Icon
            className={`${styles.action} ${styles.northAction}`}
            type={northAction.icon}
            onClick={northAction.action}
          />
          <Icon
            className={`${styles.action} ${styles.westAction}`}
            type={westAction.icon}
            onClick={westAction.action}
          />
          <Icon
            className={`${styles.action} ${styles.southAction}`}
            type={southAction.icon}
            onClick={southAction.action}
          />
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
