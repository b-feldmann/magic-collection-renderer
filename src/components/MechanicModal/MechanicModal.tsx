import React, { useContext } from 'react';
import { Button, Modal, Typography, Table } from 'antd';

import _ from 'lodash';
import { Store, StoreType } from '../../store';
import { createMechanic, updateMechanic } from '../../actions/mechanicActions';
import MechanicInterface from '../../interfaces/MechanicInterface';

const { Column } = Table;
const { Paragraph } = Typography;

interface RecordProps extends MechanicInterface {
  key: string;
}

const MechanicModal = ({
  visible,
  setVisible
}: {
  visible: boolean;
  setVisible: (key: boolean) => void;
}) => {
  const { mechanics, dispatch } = useContext<StoreType>(Store);

  const handleNameChange = (name: string, record: RecordProps) => {
    const { key, ...rest } = record;
    updateMechanic(dispatch, { ...rest, name });
  };

  const handleDescriptionChange = (description: string, record: RecordProps) => {
    const { key, ...rest } = record;
    updateMechanic(dispatch, { ...rest, description });
  };

  const sortedMechanics: RecordProps[] = _.sortBy(mechanics, [o => o.uuid]).map(mechanic => ({
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
      <Table dataSource={sortedMechanics} pagination={false} useFixedHeader scroll={{ y: '55vh' }}>
        <Column
          title="Name"
          dataIndex="name"
          key="name"
          width="30%"
          render={(name: string, record: RecordProps) => (
            <Paragraph editable={{ onChange: (value: string) => handleNameChange(value, record) }}>
              {name}
            </Paragraph>
          )}
        />
        <Column
          title="Description"
          dataIndex="description"
          key="description"
          width="70%"
          render={(description: string, record: RecordProps) => (
            <Paragraph
              editable={{ onChange: (value: string) => handleDescriptionChange(value, record) }}
            >
              {description}
            </Paragraph>
          )}
        />
      </Table>
      <Button style={{ width: '100%' }} type="primary" onClick={() => createMechanic(dispatch)}>
        Add Mechanic
      </Button>
    </Modal>
  );
};

export default MechanicModal;
