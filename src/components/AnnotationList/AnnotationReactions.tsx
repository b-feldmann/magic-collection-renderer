import React, { useContext, useEffect, useRef, useState } from 'react';
import { Popover } from 'antd';
import { BaseEmoji, NimblePicker as Picker } from 'emoji-mart';
import data from 'emoji-mart/data/apple.json';
import 'emoji-mart/css/emoji-mart.css';

import AnnotationInterface from '../../interfaces/AnnotationInterface';
import { Store } from '../../store';
import { UNKNOWN_CREATOR } from '../../utils/constants';
import { setAnnotationReaction } from '../../actions/annotationActions';
import styles from './Annotations.module.scss';

const AnnotationReactions = ({ annotation }: { annotation: AnnotationInterface }) => {
  const { currentUser, user, dispatch } = useContext(Store);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const reactionArea = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const canReact =
    currentUser.uuid !== UNKNOWN_CREATOR.uuid &&
    user.some(candidate => candidate.uuid === currentUser.uuid);
  const reactions = annotation.reactions ?? [];

  useEffect(() => {
    if (!saving && restoreFocus.current) {
      restoreFocus.current = false;
      // Do not steal focus if the user moved elsewhere during the request.
      if (document.activeElement === reactionArea.current) trigger.current?.focus();
    }
  }, [saving]);

  const closePicker = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const toggleReaction = async (emoji: string) => {
    if (!canReact || pending.current) return;
    const selected = reactions.some(
      reaction => reaction.emoji === emoji && reaction.users.includes(currentUser.uuid),
    );
    pending.current = true;
    restoreFocus.current = true;
    setSaving(true);
    setOpen(false);
    reactionArea.current?.focus();
    try {
      await setAnnotationReaction(dispatch, annotation.uuid, currentUser.uuid, emoji, !selected);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <div
      ref={reactionArea}
      tabIndex={-1}
      className={styles.reactions}
      aria-label="Comment reactions"
      aria-busy={saving}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          closePicker();
        }
      }}
    >
      {reactions
        .filter(reaction => reaction.users.length > 0)
        .map(reaction => {
          const selected = reaction.users.includes(currentUser.uuid);
          const count = reaction.users.length;
          return (
            <button
              key={reaction.emoji}
              type="button"
              className={`${styles.reaction}${selected ? ` ${styles.selectedReaction}` : ''}`}
              aria-label={`${reaction.emoji} ${count} ${count === 1 ? 'reaction' : 'reactions'}`}
              aria-pressed={selected}
              title={
                !canReact
                  ? 'Select a user to react'
                  : selected
                    ? 'Remove your reaction'
                    : 'Add your reaction'
              }
              disabled={!canReact || saving}
              onClick={() => void toggleReaction(reaction.emoji)}
            >
              <span aria-hidden="true">{reaction.emoji}</span> <span>{count}</span>
            </button>
          );
        })}
      <Popover
        trigger="click"
        placement="top"
        open={open}
        onOpenChange={next => setOpen(canReact && !saving && next)}
        content={
          <div role="dialog" aria-label="Choose a reaction" className={styles.reactionPicker}>
            {open ? (
              <Picker
                autoFocus
                data={data}
                onClick={(emoji: BaseEmoji) => void toggleReaction(emoji.native)}
                showSkinTones={false}
                showPreview={false}
                perLine={7}
                title="Choose a reaction"
              />
            ) : null}
          </div>
        }
      >
        <button
          ref={trigger}
          type="button"
          className={styles.addReaction}
          aria-label="Add reaction"
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={!canReact || saving}
          title={canReact ? 'Add reaction' : 'Select a user to react'}
        >
          <span aria-hidden="true">☺ +</span>
        </button>
      </Popover>
    </div>
  );
};

export default AnnotationReactions;
