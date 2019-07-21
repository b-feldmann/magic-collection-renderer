import { Button, Checkbox, Icon, Input, List, Select, Typography } from 'antd';
import React from 'react';
import styles from './styles.module.scss';
import useWindowDimensions from '../../useWindowDimensions';

const { TextArea } = Input;

interface EditFieldInterface {
  fieldKey: string;
  type: string;
  name: string;
  data?: string[];
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
}

const EditField: React.FC<EditFieldInterface> = (props: EditFieldInterface) => {
  const { type, fieldKey, name, data, getValue, saveValue } = props;

  const { height } = useWindowDimensions();

  let small = false;
  let tiny = false;

  if (height < 1000) small = true;
  if (height < 860) tiny = true;

  if (type === 'input') {
    return (
      <span className={tiny ? styles.tiny : ''}>
        <p className={styles.label}>{name}</p>
        <Input
          size={small ? 'small' : 'default'}
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
        />
      </span>
    );
  }

  if (type === 'area') {
    return (
      <span className={tiny ? styles.tiny : ''}>
        <p className={styles.label}>{name}</p>
        <TextArea
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
          rows={small ? 2 : 4}
        />
      </span>
    );
  }

  if (type === 'area-small') {
    return (
      <span className={tiny ? styles.tiny : ''}>
        <p className={styles.label}>{name}</p>
        <TextArea
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
          rows={small ? 1 : 2}
          autosize={{ minRows: 1, maxRows: small ? 1 : 2 }}
        />
      </span>
    );
  }

  if (type === 'bool') {
    return (
      <div className={tiny ? styles.tiny : ''}>
        <div className={styles.label}>
          <Checkbox
            checked={getValue(fieldKey)}
            onChange={e => saveValue(fieldKey, e.target.checked)}
          >
            {name}
          </Checkbox>
        </div>
      </div>
    );
  }

  if (type === 'select' && data) {
    return (
      <span className={tiny ? styles.tiny : ''}>
        <p className={styles.label}>{name}</p>
        <Select
          size={small ? 'small' : 'default'}
          value={getValue(fieldKey)}
          onChange={(value: string) => saveValue(fieldKey, value)}
          style={{ width: '100%' }}
        >
          {data.map(d => (
            <Select.Option key={`${fieldKey} + ${d}`} value={d}>
              {d}
            </Select.Option>
          ))}
        </Select>
      </span>
    );
  }

  if (type === 'list') {
    const toList = (value: string) => value.split('|');
    const toString = (list: string[]) => list.join('|');

    return (
      <span className={tiny ? styles.tiny : ''}>
        <p className={styles.label}>{name}</p>
        <List
          size={small ? 'small' : 'default'}
          bordered
          dataSource={getValue(fieldKey)}
          renderItem={(item: string, i) => (
            <List.Item
              className={styles.listItem}
              actions={[
                <Icon
                  type="close-circle"
                  theme="twoTone"
                  twoToneColor="#FF0000"
                  onClick={() => {
                    const list = getValue(fieldKey);
                    list.splice(i, 1)
                    saveValue(fieldKey, list);
                  }}
                />
              ]}
            >
              <TextArea
                value={item}
                onChange={e => {
                  const list = getValue(fieldKey);
                  list[i] = e.target.value;
                  saveValue(fieldKey, list);
                }}
                autosize={true}
              />
            </List.Item>
          )}
          footer={
            <div className={styles.centerParent}>
              <Button
                size={small ? 'small' : 'default'}
                onClick={() => {
                  const list = getValue(fieldKey);
                  list.push('');
                  saveValue(fieldKey, list);
                }}
              >
                Add Instruction
              </Button>
            </div>
          }
        />
      </span>
    );
  }

  return <div />;
};

export default EditField;
