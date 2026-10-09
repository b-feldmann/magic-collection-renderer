import { Button, Checkbox, Divider, Input, Listy, Radio, Select, Space, Upload } from 'antd';

import AntIcon from '../AntIcon/AntIcon';
import React from 'react';
import styles from './styles.module.scss';
import resizeImage from '../../utils/resizeImage';
import EditorTooltip from '../EditorTooltip';
import MechanicInterface from '../../interfaces/MechanicInterface';

const { TextArea } = Input;
const InputGroup = Input.Group;

interface EditFieldInterface {
  fieldKey: string;
  type:
    | 'input'
    | 'split-input'
    | 'upload-input'
    | 'select'
    | 'multi-select'
    | 'area'
    | 'radio'
    | 'list'
    | 'split-list'
    | 'text-list'
    | 'bool'
    | 'divider';
  name: string;
  data?: { key: string; value: string }[];
  disabledKeys?: string[];
  // Set to false to omit the "Add Mechanic" select from list footers.
  allowMechanics?: boolean;
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
  mechanics?: MechanicInterface[];
}

const EditField = (props: EditFieldInterface) => {
  const {
    type,
    fieldKey,
    name,
    data,
    disabledKeys,
    allowMechanics = true,
    getValue,
    saveValue,
    mechanics,
  } = props;

  const renderAddMechanic = () => {
    if (!mechanics || mechanics.length === 0) return null;

    return (
      <Select
        size="small"
        style={{ width: 150 }}
        placeholder="Add Mechanic"
        value={null}
        onClick={e => e.stopPropagation()}
        options={[...mechanics]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(mechanic => ({
            key: `${fieldKey}-mechanic-${mechanic.uuid}`,
            value: mechanic.uuid,
            label: mechanic.name,
          }))}
        onSelect={(uuid: string | null) => {
          const mechanic = mechanics.find(m => m.uuid === uuid);
          if (!mechanic) return;
          const list = getValue(fieldKey) || [];
          list.push(`[${mechanic.name} {X}]`);
          saveValue(fieldKey, list);
        }}
      />
    );
  };

  // A purely presentational section header inside the field list (e.g. the
  // Adventure section). The title is rendered bigger and bold so it reads as
  // a section header rather than a field label.
  if (type === 'divider') {
    return (
      <span>
        <Divider
          titlePlacement="start"
          plain
          // orientationMargin 0 collapses the start rail so the title sits
          // flush with the field's left edge instead of the default 5% indent.
          orientationMargin={0}
          styles={{
            content: { fontSize: 18, fontWeight: 'bold', marginTop: 4, marginBottom: -20 },
          }}
        >
          {name}
        </Divider>
      </span>
    );
  }

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
    const stripValue = (value?: string) => {
      if (!value) return '';
      if (value.startsWith('base64:') || value === 'loading') return '';
      if (value.startsWith('url:')) return value.substring(4);

      return value;
    };

    const getPlaceholder = (value?: string) => {
      if (!value) return '';
      if (value.startsWith('base64:')) return 'Use Uploaded Image';
      if (value === 'loading') return 'Loading Image';

      return '';
    };

    return (
      <span>
        <p className={styles.label}>{name}</p>
        <div className={styles.uploadWrapper}>
          <Upload
            beforeUpload={(file: File) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  resizeImage(reader.result, image => {
                    saveValue(fieldKey, `base64:${image}`);
                  });
                } else {
                  saveValue(fieldKey, `base64:${reader.result}`);
                }
              };
              // Prevent antd from actually uploading; we handle the file locally.
              return false;
            }}
          >
            <Button shape="circle" icon={<AntIcon type="upload" />} size="small" danger />
          </Upload>
          <Input
            size="small"
            placeholder={getPlaceholder(getValue(fieldKey))}
            value={stripValue(getValue(fieldKey))}
            onChange={e => saveValue(fieldKey, `url:${e.target.value}`)}
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
          autoSize
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
          options={data.map(d => ({
            key: `${fieldKey} + ${d.key}`,
            value: d.key,
            label: d.value,
          }))}
        />
      </span>
    );
  }

  if (type === 'multi-select' && data) {
    return (
      <span>
        <p className={styles.label}>{name}</p>
        <Select
          size="small"
          mode="multiple"
          allowClear
          value={getValue(fieldKey) || []}
          onChange={(keys: string[]) => saveValue(fieldKey, keys)}
          style={{ width: '100%' }}
          placeholder="Select Colors"
          options={data.map(d => ({
            key: `${fieldKey} + ${d.key}`,
            value: d.key,
            label: d.value,
            disabled: disabledKeys?.includes(d.key),
          }))}
        />
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
        <p className={styles.label}>
          {name} <EditorTooltip className={styles.tooltip} />
        </p>

        {/* `List` was deprecated in antd 6. `Listy` has no `bordered`, no
            per-item `actions`, and no `footer`, so those are recreated with
            markup + CSS. Items are wrapped with their index to provide a stable
            `rowKey` (values can repeat, e.g. blank instructions). */}
        <div className={styles.listBordered}>
          <Listy<{ value: string; index: number }>
            rowKey="index"
            classNames={{ item: styles.listItem }}
            items={((getValue(fieldKey) as string[]) || []).map((value, index) => ({
              value,
              index,
            }))}
            itemRender={({ value: item, index: i }) => (
              <div className={styles.listItemInner}>
                <div className={styles.listItemContent}>
                  {type === 'list' ? (
                    <TextArea
                      value={item}
                      onChange={e => {
                        const list = getValue(fieldKey);
                        list[i] = e.target.value;
                        saveValue(fieldKey, list);
                      }}
                      autoSize
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
                        autoSize
                      />
                    </InputGroup>
                  )}
                </div>
                <div className={styles.listItemActions}>
                  <AntIcon
                    type="close-circle"
                    theme="twoTone"
                    twoToneColor="#FF0000"
                    onClick={() => {
                      const list = getValue(fieldKey);
                      list.splice(i, 1);
                      saveValue(fieldKey, list);
                    }}
                  />
                </div>
              </div>
            )}
          />
          <div className={styles.listFooter}>
            <div className={styles.centerParent}>
              <Space.Compact>
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
                {allowMechanics && renderAddMechanic()}
              </Space.Compact>
            </div>
          </div>
        </div>
      </span>
    );
  }

  if (type === 'text-list') {
    // Every line in the text area maps 1:1 to a cardText element — including
    // empty lines, which are stored as empty strings (round-trip stable).
    const joined = ((getValue(fieldKey) as string[]) || []).join('\n');

    return (
      <span>
        <p className={styles.label}>
          {name} <EditorTooltip className={styles.tooltip} />
        </p>
        <TextArea
          value={joined}
          onChange={e => saveValue(fieldKey, e.target.value.split('\n'))}
          autoSize
        />
        {allowMechanics ? (
          <div className={styles.listFooter}>
            <div className={styles.centerParent}>{renderAddMechanic()}</div>
          </div>
        ) : null}
      </span>
    );
  }

  return <div />;
};

export default EditField;
