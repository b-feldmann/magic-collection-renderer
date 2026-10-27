import { Button, Input, Listy, Radio, Select, Space, Switch, Tag } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import CrownOutlined from '@ant-design/icons/CrownOutlined';

import AntIcon from '../AntIcon/AntIcon';
import React, { useId } from 'react';
import styles from './styles.module.scss';
import { getCoverFileName, isUploadedCover } from '../../utils/cover';
import EditorTooltip from '../EditorTooltip';
import CardTextInput from './CardTextInput';

const { TextArea } = Input;
const InputGroup = Input.Group;

interface EditFieldInterface {
  fieldKey: string;
  type:
    | 'input'
    | 'split-input'
    | 'paired-text'
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
  placeholder?: string;
  optional?: boolean;
  pairedFieldKey?: string;
  data?: { key: string; value: string }[];
  disabledKeys?: string[];
  allowCreate?: boolean;
  nonRemovableValues?: string[];
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
}

interface UploadInputInterface {
  fieldKey: string;
  inputId: string;
  name: string;
  placeholder?: string;
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
}

// The file name of an uploaded cover is persisted with the card value (see
// utils/cover.ts), so it needs no local state and survives card switches and
// reloads — unlike antd's internal Upload list, which leaked across cards.
const UploadInput = ({
  fieldKey,
  inputId,
  name,
  placeholder,
  getValue,
  saveValue,
}: UploadInputInterface) => {
  const coverValue = getValue(fieldKey);
  const uploaded = isUploadedCover(coverValue);
  const fileName = getCoverFileName(coverValue);

  return (
    <div
      className={styles.uploadWrapper}
      role={uploaded ? 'group' : undefined}
      aria-labelledby={uploaded ? `${inputId}-label` : undefined}
    >
      {uploaded ? (
        <span id={`${inputId}-label`} className={styles.label}>
          {name}
        </span>
      ) : (
        <label className={styles.label} htmlFor={inputId}>
          {name}
        </label>
      )}
      <div className={styles.uploadRow}>
        {/* Uploaded covers have no editable URL. Render the persisted filename
            instead of an uncontrolled Upload file list that leaks across cards. */}
        {uploaded ? (
          <span className={styles.uploadFileName}>
            <PaperClipOutlined aria-hidden="true" /> {fileName || 'Uploaded Image'}
          </span>
        ) : (
          <Input
            id={inputId}
            placeholder={placeholder}
            className={styles.uploadInput}
            size="small"
            value={stripUploadValue(coverValue)}
            onChange={e => saveValue(fieldKey, `url:${e.target.value}`)}
          />
        )}
        {coverValue ? (
          <Button
            shape="circle"
            size="small"
            aria-label="Remove cover"
            icon={<AntIcon type="close-circle" theme="twoTone" twoToneColor="#FF0000" />}
            onClick={() => saveValue(fieldKey, '')}
          />
        ) : null}
      </div>
    </div>
  );
};

// Only URL (or legacy raw) values reach the editable input.
const stripUploadValue = (value?: string) => {
  if (!value) return '';
  if (value.startsWith('url:')) return value.substring(4);

  return value;
};

const EditField = (props: EditFieldInterface) => {
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const {
    type,
    fieldKey,
    name,
    placeholder,
    optional = false,
    pairedFieldKey,
    data,
    disabledKeys,
    allowCreate = false,
    nonRemovableValues,
    getValue,
    saveValue,
  } = props;

  const optionalId = optional ? `${fieldId}-optional` : undefined;
  const inputLabel = (
    <div className={styles.labelRow}>
      <label className={styles.label} htmlFor={fieldId}>
        {name}
      </label>
      {optional && (
        <span id={optionalId} className={styles.optional}>
          optional
        </span>
      )}
    </div>
  );

  // A purely presentational section header inside the field list (e.g. the
  // Adventure section). The title is rendered bigger and bold so it reads as
  // a section header rather than a field label.
  if (type === 'divider') {
    return <h3 className={styles.specialtyHeading}>{name}</h3>;
  }

  if (type === 'input') {
    return (
      <span>
        {inputLabel}
        <Input
          id={fieldId}
          placeholder={placeholder}
          aria-describedby={optionalId}
          size="small"
          value={getValue(fieldKey)}
          onChange={e => saveValue(fieldKey, e.target.value)}
        />
      </span>
    );
  }

  if (type === 'paired-text' && pairedFieldKey) {
    const text = ((getValue(pairedFieldKey) as string[]) || []).join('\n');

    return (
      <span role="group" aria-labelledby={labelId}>
        <p id={labelId} className={styles.label}>
          {name} <EditorTooltip className={styles.tooltip} />
        </p>
        <InputGroup compact>
          <Input
            aria-label={`${name} indicator`}
            placeholder="Indicator"
            style={{ width: '20%' }}
            value={getValue(fieldKey) || ''}
            onChange={e => saveValue(fieldKey, e.target.value)}
          />
          <TextArea
            aria-label={`${name} text`}
            placeholder="Card Text"
            style={{ width: '80%' }}
            value={text}
            onChange={e => saveValue(pairedFieldKey, e.target.value.split('\n'))}
            autoSize
          />
        </InputGroup>
      </span>
    );
  }

  if (type === 'upload-input') {
    return (
      <UploadInput
        fieldKey={fieldKey}
        inputId={fieldId}
        name={name}
        placeholder={placeholder}
        getValue={getValue}
        saveValue={saveValue}
      />
    );
  }

  if (type === 'split-input') {
    const splitArray = getValue(fieldKey) ? getValue(fieldKey).split('/') : ['', ''];
    if (splitArray.length < 2) splitArray.push('');
    const [firstLabel, secondLabel] = name.split('/');

    return (
      <div
        role="group"
        aria-label={`${firstLabel} / ${secondLabel}`}
        className={styles.statsInputs}
      >
        <div>
          <label className={styles.label} htmlFor={`${fieldId}-first`}>
            {firstLabel}
          </label>
          <Input
            id={`${fieldId}-first`}
            size="small"
            className={styles.statInput}
            value={splitArray[0]}
            onChange={e => saveValue(fieldKey, `${e.target.value}/${splitArray[1]}`)}
          />
        </div>
        <div>
          <label className={styles.label} htmlFor={`${fieldId}-second`}>
            {secondLabel}
          </label>
          <Input
            id={`${fieldId}-second`}
            size="small"
            className={styles.statInput}
            value={splitArray[1]}
            onChange={e => saveValue(fieldKey, `${splitArray[0]}/${e.target.value}`)}
          />
        </div>
      </div>
    );
  }

  if (type === 'area') {
    return (
      <span>
        {inputLabel}
        <TextArea
          id={fieldId}
          placeholder={placeholder}
          aria-describedby={optionalId}
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
        <div className={styles.booleanField}>
          <label id={labelId} htmlFor={fieldId} className={styles.booleanLabel}>
            {fieldKey === 'legendary' && (
              <CrownOutlined className={styles.legendaryIcon} aria-hidden="true" />
            )}
            {name}
          </label>
          <Switch
            id={fieldId}
            size="small"
            aria-labelledby={labelId}
            checked={!!getValue(fieldKey)}
            onChange={checked => saveValue(fieldKey, checked)}
          />
        </div>
      </div>
    );
  }

  if (type === 'select' && data) {
    return (
      <span>
        <label className={styles.label} htmlFor={fieldId}>
          {name}
        </label>
        <Select
          id={fieldId}
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
        <label className={styles.label} htmlFor={fieldId}>
          {name}
        </label>
        <Select
          id={fieldId}
          size="small"
          mode={allowCreate ? 'tags' : 'multiple'}
          allowClear
          value={getValue(fieldKey) || []}
          onChange={(keys: string[]) => saveValue(fieldKey, keys)}
          style={{ width: '100%' }}
          placeholder={placeholder ?? (allowCreate ? 'Add Tags' : 'Select Colors')}
          tagRender={
            allowCreate
              ? props => (
                  <Tag
                    closable={props.closable && !nonRemovableValues?.includes(String(props.value))}
                    onClose={props.onClose}
                  >
                    {props.label}
                  </Tag>
                )
              : undefined
          }
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
        <span id={labelId} className={styles.label}>
          {name}
        </span>
        <Radio.Group
          role="group"
          aria-labelledby={labelId}
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
        <p id={labelId} className={styles.label}>
          {name} <EditorTooltip className={styles.tooltip} />
        </p>

        {/* `List` was deprecated in antd 6. `Listy` has no `bordered`, no
            per-item `actions`, and no `footer`, so those are recreated with
            markup + CSS. Items are wrapped with their index to provide a stable
            `rowKey` (values can repeat, e.g. blank instructions). */}
        <div className={styles.listBordered} role="group" aria-labelledby={labelId}>
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
                      aria-label={`${name} instruction ${i + 1}`}
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
                        aria-label={`${name} cost ${i + 1}`}
                        style={{ width: '20%' }}
                        value={split(item).cost}
                        onChange={e => {
                          const list = getValue(fieldKey);
                          list[i] = `${e.target.value}|${split(item).text}`;
                          saveValue(fieldKey, list);
                        }}
                      />
                      <TextArea
                        aria-label={`${name} instruction ${i + 1}`}
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
              </Space.Compact>
            </div>
          </div>
        </div>
      </span>
    );
  }

  if (type === 'text-list') {
    return (
      <CardTextInput
        id={fieldId}
        name={name}
        value={(getValue(fieldKey) as string[]) || []}
        onChange={lines => saveValue(fieldKey, lines)}
      />
    );
  }

  return <div />;
};

export default EditField;
