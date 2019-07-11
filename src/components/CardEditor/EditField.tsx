import { Checkbox, Input, Select } from 'antd';
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

  if (height < 840) small = true;
  if (height < 710) tiny = true;

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

  return <div />;
};

export default EditField;
