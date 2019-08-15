// tslint:disable:no-any
import { Popconfirm, Table } from 'antd';
import React from 'react';

import { ColumnProps } from 'antd/lib/table';
import { EditableCell } from './EditableCell';
import { EditableFormRow } from './EditableRow';

export const EditableContext = React.createContext({ form: {} });

interface State {
  editingKey: any;
}
interface Props {
  data: any[];
  columns: any[];
  onSave: (data: any, key: string) => void;
}
interface ColumnPropsEditable<T> extends ColumnProps<T> {
  editable?: boolean;
}

export class EditableTable extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { editingKey: '' };
  }

  public isEditing = (record: any) => record.key === this.state.editingKey;

  public cancel = () => {
    this.setState({ editingKey: '' });
  };

  public save(form: any, key: any) {
    form.validateFields((error: any, row: any) => {
      if (error) {
        return;
      }
      const newData = [...this.props.data];
      const index = newData.findIndex(item => key === item.key);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...row
        });
      } else {
        newData.push(row);
      }
      this.props.onSave(newData, this.state.editingKey);
      this.setState({ editingKey: '' });
    });
  }

  public edit(key: any) {
    this.setState({ editingKey: key });
  }

  public render() {
    const components = {
      body: {
        row: EditableFormRow,
        cell: EditableCell
      }
    };

    const columns = [
      ...this.props.columns,
      {
        title: 'operation',
        dataIndex: 'operation',
        render: (text: string, record: any) => {
          const editable = this.isEditing(record);
          return (
            <div>
              {editable ? (
                <span>
                  <EditableContext.Consumer>
                    {form => (
                      <a
                        href="javascript:;"
                        onClick={() => this.save(form, record.key)}
                        style={{ marginRight: 8 }}
                      >
                        Save
                      </a>
                    )}
                  </EditableContext.Consumer>
                  <Popconfirm title="Sure to cancel?" onConfirm={() => this.cancel()}>
                    <a>Cancel</a>
                  </Popconfirm>
                </span>
              ) : (
                <a onClick={() => this.edit(record.key)}>Edit</a>
              )}
            </div>
          );
        }
      }
    ];

    const parsedColumns = columns.map((col: any) => {
      if (!col.editable) {
        return col;
      }
      return {
        ...col,
        onCell: (record: any) => ({
          record,
          inputType: 'text',
          dataIndex: col.dataIndex,
          title: col.title,
          editing: this.isEditing(record)
        })
      };
    });

    return (
      <Table
        components={components}
        bordered
        dataSource={this.props.data}
        columns={parsedColumns}
        // rowClassName="editable-row"
      />
    );
  }
}
