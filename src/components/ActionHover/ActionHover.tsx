import React from 'react';

import AntIcon from '../AntIcon/AntIcon';
import styles from './styles.module.scss';

interface ActionHoverInterface {
    northAction?: { icon: string; action: () => void };
    southAction?: { icon: string; action: () => void };
    eastAction?: { icon: string; action: () => void };
    westAction?: { icon: string; action: () => void };
    active?: boolean;
    onHover?: () => void;
    onClick?: () => void;
    children?: React.ReactNode;
}

const ActionHover: React.FC<ActionHoverInterface> = (actions) => {
    const {
        northAction, eastAction, westAction, southAction, active, onHover = () => {
        }, onClick = () => {
        }
    } = actions;

    const hasActions: boolean = !!northAction || !!eastAction || !!westAction || !!southAction;

    return (
        <div
            className={`${styles.outer} ${active ? styles.active : ''}`}
            onMouseEnter={() => onHover()}
            onClick={() => onClick()}
        >
            <div className={styles.hovereffect}>
                <div className={styles.target}>{actions.children}</div>
                {hasActions && (
                    <div className={styles.overlay}>
                        {eastAction && (
                            <AntIcon
                                className={`${styles.action} ${styles.eastAction}`}
                                type={eastAction.icon}
                                onClick={eastAction.action}
                            />
                        )}
                        {northAction && (
                            <AntIcon
                                className={`${styles.action} ${styles.northAction}`}
                                type={northAction.icon}
                                onClick={northAction.action}
                            />
                        )}
                        {westAction && (
                            <AntIcon
                                className={`${styles.action} ${styles.westAction}`}
                                type={westAction.icon}
                                onClick={westAction.action}
                            />
                        )}
                        {southAction && (
                            <AntIcon
                                className={`${styles.action} ${styles.southAction}`}
                                type={southAction.icon}
                                onClick={southAction.action}
                            />
                        )}
                        <div className={styles.rotate}>
                            <hr/>
                            <hr/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionHover;
