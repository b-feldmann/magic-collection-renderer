import { Button, Checkbox, Icon, Input, List, Select } from 'antd';
import React from 'react';
import styles from './styles.module.scss';

const { TextArea } = Input;

interface EditFieldInterface {
  fieldKey: string;
  type: string;
  name: string;
  data?: string[];
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
}

const EditField = (props: EditFieldInterface) => {
  const { type, fieldKey, name, data, getValue, saveValue } = props;

  if (type === 'input') {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <Input
          size="small"
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
        />
      </span>
    );
  }

  if (type === 'split-input') {
    const splitArray = getValue(fieldKey) ? getValue(fieldKey).split('/') : ['', ''];
    if (splitArray.length < 2) splitArray.push('');

    return (
      <span>
        <div className={styles.splitInput}>
          <p className={styles.label}>{name.split('/')[0]}</p>
          <Input
            size="small"
            value={splitArray[0]}
            onChange={e => saveValue(fieldKey, `${e.target.value}/${splitArray[1]}`)}
          />
        </div>
        <div className={styles.splitInput}>
          <p className={styles.label}>{name.split('/')[1]}</p>
          <Input
            size="small"
            value={splitArray[1]}
            onChange={e => saveValue(fieldKey, `${splitArray[0]}/${e.target.value}`)}
          />
        </div>
      </span>
    );
  }

  if (type === 'area') {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <TextArea
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
          autosize
        />
      </span>
    );
  }

  if (type === 'bool') {
    return (
      <div>
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
      <span>
        <p className={styles.label}>{name}</p>
        <Select
          size="small"
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
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <List
          size="small"
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
                    list.splice(i, 1);
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
                autosize
              />
            </List.Item>
          )}
          footer={
            <div className={styles.centerParent}>
              <Button
                size="small"
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
