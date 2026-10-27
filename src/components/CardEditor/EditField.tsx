import { Button, Checkbox, Divider, Input, Listy, Radio, Select, Space, Tag, Upload } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';

import AntIcon from '../AntIcon/AntIcon';
import React from 'react';
import styles from './styles.module.scss';
import resizeImage from '../../utils/resizeImage';
import { getCoverFileName, isUploadedCover } from '../../utils/cover';
import EditorTooltip from '../EditorTooltip';

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
  getValue: (key: string) => any;
  saveValue: (key: string, value: any) => void;
}

// The file name of an uploaded cover is persisted with the card value (see
// utils/cover.ts), so it needs no local state and survives card switches and
// reloads — unlike antd's internal Upload list, which leaked across cards.
const UploadInput = ({ fieldKey, getValue, saveValue }: UploadInputInterface) => {
  const coverValue = getValue(fieldKey);
  const uploaded = isUploadedCover(coverValue);
  const fileName = getCoverFileName(coverValue);

  return (
    <div className={styles.uploadWrapper}>
      <div className={styles.uploadRow}>
        {/* `showUploadList={false}`: antd's internal file list is uncontrolled
            state that survives switching to another card and squishes the URL
            input. The persisted file name is rendered below instead. */}
        <Upload
          showUploadList={false}
          beforeUpload={(file: File) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              // The file name travels with the value; the image data is
              // uploaded to the middleware on save (see cardActions).
              if (typeof reader.result === 'string') {
                resizeImage(reader.result, image => {
                  saveValue(fieldKey, `base64:${file.name}|${image}`);
                });
              } else {
                saveValue(fieldKey, `base64:${file.name}|${reader.result}`);
              }
            };
            // Prevent antd from actually uploading; we handle the file locally.
            return false;
          }}
        >
          <Button shape="circle" icon={<AntIcon type="upload" />} size="small" danger />
        </Upload>
        {/* Uploaded covers have no URL to edit — the persisted file name is
            shown below the row instead. */}
        {!uploaded && (
          <Input
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
      {uploaded && (
        <span className={styles.uploadFileName}>
          <PaperClipOutlined /> {fileName || 'Uploaded Image'}
        </span>
      )}
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
  const {
    type,
    fieldKey,
    name,
    pairedFieldKey,
    data,
    disabledKeys,
    allowCreate = false,
    nonRemovableValues,
    getValue,
    saveValue,
  } = props;

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

  if (type === 'paired-text' && pairedFieldKey) {
    const text = ((getValue(pairedFieldKey) as string[]) || []).join('\n');

    return (
      <span>
        <p className={styles.label}>
          {name} <EditorTooltip className={styles.tooltip} />
        </p>
        <InputGroup compact>
          <Input
            placeholder="Indicator"
            style={{ width: '20%' }}
            value={getValue(fieldKey) || ''}
            onChange={e => saveValue(fieldKey, e.target.value)}
          />
          <TextArea
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
      <span>
        <p className={styles.label}>{name}</p>
        <UploadInput fieldKey={fieldKey} getValue={getValue} saveValue={saveValue} />
      </span>
    );
  }

  if (type === 'split-input') {
    const splitArray = getValue(fieldKey) ? getValue(fieldKey).split('/') : ['', ''];
    if (splitArray.length < 2) splitArray.push('');
    const [firstLabel, secondLabel] = name.split('/');

    return (
      <span>
        <p className={styles.label}>
          <span>{firstLabel}</span> / <span>{secondLabel}</span>
        </p>
        <Space.Compact
          block
          size="small"
          role="group"
          aria-label={`${firstLabel} / ${secondLabel}`}
          className={styles.splitInput}
        >
          <Input
            aria-label={firstLabel}
            value={splitArray[0]}
            onChange={e => saveValue(fieldKey, `${e.target.value}/${splitArray[1]}`)}
          />
          <Input
            className={styles.splitInputSeparator}
            value="/"
            readOnly
            tabIndex={-1}
            aria-hidden="true"
          />
          <Input
            aria-label={secondLabel}
            value={splitArray[1]}
            onChange={e => saveValue(fieldKey, `${splitArray[0]}/${e.target.value}`)}
          />
        </Space.Compact>
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
          mode={allowCreate ? 'tags' : 'multiple'}
          allowClear
          value={getValue(fieldKey) || []}
          onChange={(keys: string[]) => saveValue(fieldKey, keys)}
          style={{ width: '100%' }}
          placeholder={allowCreate ? 'Add Tags' : 'Select Colors'}
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
      </span>
    );
  }

  return <div />;
};

export default EditField;
