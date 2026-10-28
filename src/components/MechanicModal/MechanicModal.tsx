import React, { useContext, useId, useRef, useState } from 'react';
import Button from 'antd/es/button';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import PlusOutlined from '@ant-design/icons/PlusOutlined';

import sortBy from 'lodash/sortBy';
import { Store, StoreType } from '../../store';
import { createMechanic, updateMechanic } from '../../actions/mechanicActions';
import MechanicInterface from '../../interfaces/MechanicInterface';
import editorStyles from '../CardEditor/styles.module.scss';
import styles from './styles.module.scss';

const MechanicFields = ({ mechanic, index }: { mechanic: MechanicInterface; index: number }) => {
  const { cards, dispatch } = useContext<StoreType>(Store);
  const [edits, setEdits] = useState<Partial<Pick<MechanicInterface, 'name' | 'description'>>>({});
  const draft = { ...mechanic, ...edits };
  const submitted = useRef<MechanicInterface | null>(null);
  const id = useId();

  const save = async () => {
    if (
      (draft.name === mechanic.name && draft.description === mechanic.description) ||
      (draft.name === submitted.current?.name &&
        draft.description === submitted.current?.description)
    ) {
      return;
    }
    // Keep both edits together even if the previous request has not updated the store yet.
    submitted.current = draft;
    const saved = await updateMechanic(dispatch, draft, cards);
    if (submitted.current === draft) submitted.current = null;
    if (saved) {
      // Drop acknowledged overrides only; typing during the request must stay intact.
      setEdits(current => {
        const next = { ...current };
        if (next.name === draft.name) delete next.name;
        if (next.description === draft.description) delete next.description;
        return next;
      });
    }
  };

  return (
    <article className={styles.mechanic} aria-labelledby={`${id}-index ${id}-heading`}>
      <header className={styles.mechanicHeader}>
        <span className={styles.number} id={`${id}-index`}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 id={`${id}-heading`}>{draft.name || 'New mechanic'}</h3>
      </header>
      <div className={styles.fields}>
        <div>
          <label className={editorStyles.label} htmlFor={`${id}-name`}>
            Name
          </label>
          <Input
            id={`${id}-name`}
            value={draft.name}
            placeholder="e.g. Flying"
            onChange={event => setEdits(current => ({ ...current, name: event.target.value }))}
            onBlur={save}
          />
        </div>
        <div>
          <label className={editorStyles.label} htmlFor={`${id}-description`}>
            Description
          </label>
          <Input.TextArea
            id={`${id}-description`}
            value={draft.description}
            placeholder="Describe how this mechanic works…"
            autoSize={{ minRows: 1, maxRows: 8 }}
            onChange={event =>
              setEdits(current => ({ ...current, description: event.target.value }))
            }
            onBlur={save}
          />
        </div>
      </div>
    </article>
  );
};

const MechanicModal = ({
  visible,
  setVisible,
}: {
  visible: boolean;
  setVisible: (key: boolean) => void;
}) => {
  const { mechanics, cards, dispatch } = useContext<StoreType>(Store);
  const sortedMechanics = sortBy(mechanics, [o => o.uuid]);

  return (
    <Modal
      className={styles.modal}
      width={920}
      title="Edit Mechanics"
      open={visible}
      centered
      destroyOnHidden
      onCancel={() => setVisible(false)}
      footer={
        <div className={styles.footer}>
          <span className={editorStyles.autosaveNote}>Changes save when you leave a field</span>
          <Button onClick={() => setVisible(false)}>Done</Button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.intro}>
          Define the keywords and abilities that bring your cards to life.
        </p>
        {sortedMechanics.length === 0 ? (
          <div className={styles.empty}>
            <h3>No mechanics yet</h3>
            <p>Add your first mechanic to give it a name and description.</p>
          </div>
        ) : (
          sortedMechanics.map((mechanic, index) => (
            <MechanicFields key={mechanic.uuid} mechanic={mechanic} index={index} />
          ))
        )}
        <article className={styles.newMechanic} aria-label="Add a mechanic">
          <Button
            className={styles.addButton}
            icon={<PlusOutlined />}
            block
            onClick={() => createMechanic(dispatch, cards)}
          >
            Add Mechanic
          </Button>
        </article>
      </div>
    </Modal>
  );
};

export default MechanicModal;
