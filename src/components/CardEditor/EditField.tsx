import { Button, Checkbox, Icon, Input, List, Radio, Select, Upload } from 'antd';
import React from 'react';
import styles from './styles.module.scss';
import resizeImage from '../../utils/resizeImage';

const { TextArea } = Input;
const InputGroup = Input.Group;

interface EditFieldInterface {
  fieldKey: string;
  type:
    | 'input'
    | 'split-input'
    | 'upload-input'
    | 'select'
    | 'area'
    | 'radio'
    | 'list'
    | 'split-list'
    | 'bool';
  name: string;
  data?: { key: string; value: string }[];
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

  if (type === 'upload-input') {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <div className={styles.uploadWrapper}>
          <Upload
            transformFile={file => {
              return new Promise(resolve => {
                const reader = new FileReader();
                // @ts-ignore
                reader.readAsDataURL(file);
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    resizeImage(reader.result, image => {
                      saveValue(fieldKey, image);
                    });
                  } else {
                    saveValue(fieldKey, reader.result);
                  }
                };
              });
            }}
          >
            <Button shape="circle" icon="upload" size="small" type="danger" />
          </Upload>
          <Input
            size="small"
            value={getValue(fieldKey)}
            onChange={e => saveValue(fieldKey, e.target.value)}
          />
        </div>
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
          onChange={(key: string) => saveValue(fieldKey, key)}
          style={{ width: '100%' }}
        >
          {data.map(d => (
            <Select.Option key={`${fieldKey} + ${d.key}`} value={d.key}>
              {d.value}
            </Select.Option>
          ))}
        </Select>
      </span>
    );
  }

  if (type === 'radio' && data) {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <Radio.Group
          buttonStyle="solid"
          value={getValue(fieldKey) || 'Regular'}
          onChange={e => saveValue(fieldKey, e.target.value)}
          style={{ width: '100%' }}
        >
          {data.map(d => (
            <Radio.Button key={`${fieldKey} + ${d.key}`} value={d.key}>
              {d.value}
            </Radio.Button>
          ))}
        </Radio.Group>
      </span>
    );
  }

  if (type === 'list' || type === 'split-list') {
    const split = (line: string) => {
      if (!line) return { cost: '', text: '' };

      const splitIndex = line.indexOf('|');
      if (splitIndex === -1) return { cost: '', text: line };

      return { cost: line.substring(0, splitIndex), text: line.substring(splitIndex + 1) };
    };

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
              {type === 'list' ? (
                <TextArea
                  value={item}
                  onChange={e => {
                    const list = getValue(fieldKey);
                    list[i] = e.target.value;
                    saveValue(fieldKey, list);
                  }}
                  autosize
                />
              ) : (
                <InputGroup compact>
                  <Input
                    style={{ width: '20%' }}
                    value={split(item).cost}
                    onChange={e => {
                      const list = getValue(fieldKey);
                      list[i] = `${e.target.value}|${split(item).text}`;
                      saveValue(fieldKey, list);
                    }}
                  />
                  <TextArea
                    style={{ width: '80%' }}
                    value={split(item).text}
                    onChange={e => {
                      const list = getValue(fieldKey);
                      list[i] = `${split(item).cost}|${e.target.value}`;
                      saveValue(fieldKey, list);
                    }}
                    autosize
                  />
                </InputGroup>
              )}
            </List.Item>
          )}
          footer={
            <div className={styles.centerParent}>
              <Button
                disabled={type === 'split-list' && getValue(fieldKey).length === 4}
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
