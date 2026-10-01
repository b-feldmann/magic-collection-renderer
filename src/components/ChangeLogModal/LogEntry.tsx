import React from 'react';
import {Listy, Row, Typography} from 'antd';
import ChangeLogEntryInterface from '../../interfaces/ChangeLogEntryInterface';

import styles from './logEntry.module.scss';
import {ChangeLogFeatureType} from '../../interfaces/enums';

const {Text} = Typography;

// `List` was deprecated in antd 6 in favour of `Listy`, which iterates a flat
// `items` array via `itemRender` and requires a `rowKey`. Wrapping each entry
// with its index gives a stable, unique key (content can repeat).
type LogContentItem = ChangeLogEntryInterface['content'][number] & { key: number };

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

    const featureTypes = [
        ChangeLogFeatureType.Added,
        ChangeLogFeatureType.Fixed,
        ChangeLogFeatureType.Changed,
        ChangeLogFeatureType.Removed,
        ChangeLogFeatureType.Deprecated,
        ChangeLogFeatureType.Security,
        ChangeLogFeatureType.None,
    ];

    return (
        <Row className={styles.entry}>
            <div className={styles.title}>{`${entry.version} — ${entry.title}`}</div>

            {featureTypes.map(featureType => {
                    if (entry.content.filter(item => item.type === featureType).length === 0) {
                        return null;
                    }

                    return (
                        <div>
                            <span>
                            <Text code className={typeColor(featureType)}>
                                {featureType}
                            </Text>
                        </span>
                            <Listy<LogContentItem>
                                rowKey="key"
                                items={entry.content.filter(item => item.type === featureType).map((item, index) => ({
                                    ...item,
                                    key: index
                                }))}
                                classNames={{item: styles.item}}
                                itemRender={(item) => (
                                    <>
                                        <Row>
                                            <Text strong className={styles.featureName}>
                                                {item.feature}
                                            </Text>
                                        </Row>
                                        <Text className={styles.description}>{item.description}</Text>
                                    </>
                                )}
                            />
                        </div>
                    )
                }
            )}
        </Row>
    );
};

export default LogEntry;
