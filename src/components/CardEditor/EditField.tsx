import { Checkbox, Input, Select } from 'antd';
import React from 'react';
import styles from './styles.module.css';

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

  if (type === 'input') {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <Input
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
        />
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
          rows={4}
        />
      </span>
    );
  }

  if (type === 'area-small') {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <TextArea
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
          rows={2}
        />
      </span>
    );
  }

  if (type === 'bool') {
    return (
      <Checkbox
        className={styles.label}
        checked={getValue(fieldKey)}
        onChange={e => saveValue(fieldKey, e.target.checked)}
      >
        {name}
      </Checkbox>
    );
  }

  if (type === 'select' && data) {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <Select
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

  return <div></div>;
};

export default EditField;
