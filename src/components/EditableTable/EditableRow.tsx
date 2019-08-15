// tslint:disable:no-any
import { Form } from 'antd';
import React from 'react';
import { EditableContext } from './EditableTable';

const EditableRow = ({ form, index, ...props }: any) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

export const EditableFormRow = Form.create()(EditableRow);
