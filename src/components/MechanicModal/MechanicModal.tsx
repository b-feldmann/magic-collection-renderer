import React, { useContext } from 'react';
import { Button, Modal } from 'antd';

import _ from 'lodash';
import { Store, StoreType } from '../../store';
import { createMechanic, updateMechanic } from '../../actions/mechanicActions';
import { EditableTable } from '../EditableTable/EditableTable';

const MechanicModal = ({
  visible,
  setVisible
}: {
  visible: boolean;
  setVisible: (key: boolean) => void;
}) => {
  const { mechanics, dispatch } = useContext<StoreType>(Store);

  function handleTableChange(nextSource: any, key: string) {
    // @ts-ignore
    nextSource.forEach(data => {
      if (data.key === key) {
        updateMechanic(dispatch, data);
      }
    });
  }

  const columns = [
    {
      title: 'name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      editable: true
    },
    {
      title: 'description',
      dataIndex: 'description',
      key: 'description',
      width: '70%',
      editable: true
    }
  ];

  const sortedMechanics = _.sortBy(mechanics, [o => o.uuid]).map(mechanic => ({
    ...mechanic,
    key: mechanic.uuid
  }));

  return (
    <Modal
      width="90%"
      title="Edit Mechanics"
      visible={visible}
      onOk={() => setVisible(false)}
      onCancel={() => setVisible(false)}
    >
      <Button style={{ width: '100%' }} type="primary" onClick={() => createMechanic(dispatch)}>
        Add Mechanic
      </Button>
      <EditableTable data={sortedMechanics} columns={columns} onSave={handleTableChange} />
    </Modal>
  );
};

export default MechanicModal;
