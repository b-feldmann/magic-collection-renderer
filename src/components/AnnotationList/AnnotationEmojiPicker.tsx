import React from 'react';
import data from '@emoji-mart/data/sets/15/google.json';
import Picker from '@emoji-mart/react';

import { getGoogleSpritesheetURL } from './emojiPicker';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: { native: string }) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => (
  <Picker
    data={data}
    onEmojiSelect={onEmojiSelect}
    set="google"
    getSpritesheetURL={getGoogleSpritesheetURL}
    theme="light"
    skinTonePosition="none"
    previewPosition="none"
    style={
      {
        '--rgb-color': '38, 43, 51',
        '--rgb-accent': '124, 92, 255',
        '--rgb-background': '255, 255, 255',
        '--rgb-input': '248, 249, 252',
        '--color-border': 'rgba(38, 43, 51, 0.08)',
        '--border-radius': '16px',
        '--shadow': '0 18px 45px rgba(38, 43, 51, 0.16)',
        height: '435px',
        maxHeight: '435px',
        overflow: 'hidden',
      } as React.CSSProperties
    }
  />
);

export default EmojiPicker;
