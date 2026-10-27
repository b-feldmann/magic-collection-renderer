import type { CSSProperties } from 'react';
import data from '@emoji-mart/data/sets/15/google.json';
import { getGoogleSpritesheetURL } from './emojiPicker';

const skinsByNative = new Map<string, { x: number; y: number }>();
for (const emoji of Object.values(data.emojis)) {
  for (const skin of emoji.skins) skinsByNative.set(skin.native, skin);
}

// Prefer whole sequences over their shorter skin-tone/ZWJ prefixes.
const emojiPattern = new RegExp(
  `(${Array.from(skinsByNative.keys())
    .sort((a, b) => b.length - a.length)
    .map(emoji => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'u',
);

export const splitGoogleEmoji = (text: string) => text.split(emojiPattern);
export const findGoogleEmoji = (text: string) => emojiPattern.exec(text);

export const getGoogleEmojiStyle = (emoji: string): CSSProperties | undefined => {
  const skin = skinsByNative.get(emoji);
  if (!skin) return undefined;
  return {
    display: 'inline-block',
    width: '1em',
    height: '1em',
    verticalAlign: '-0.125em',
    backgroundImage: `url(${getGoogleSpritesheetURL()})`,
    backgroundSize: `${100 * data.sheet.cols}% ${100 * data.sheet.rows}%`,
    backgroundPosition: `${(100 / (data.sheet.cols - 1)) * skin.x}% ${(100 / (data.sheet.rows - 1)) * skin.y}%`,
  };
};
