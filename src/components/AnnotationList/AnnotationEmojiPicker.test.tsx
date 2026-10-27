import { expect, it } from 'vitest';
import EmojiPicker from './AnnotationEmojiPicker';

it('supplies sprite coordinates for every emoji rendered in the Google picker', () => {
  const picker = EmojiPicker({ onEmojiSelect: () => {} });
  const { data } = picker.props;

  for (const emoji of Object.values(data.emojis) as {
    skins: { x?: number; y?: number }[];
  }[]) {
    for (const skin of emoji.skins) {
      expect(skin.x).toBeTypeOf('number');
      expect(skin.y).toBeTypeOf('number');
      expect(skin.x).toBeGreaterThanOrEqual(0);
      expect(skin.x).toBeLessThan(data.sheet.cols);
      expect(skin.y).toBeGreaterThanOrEqual(0);
      expect(skin.y).toBeLessThan(data.sheet.rows);
    }
  }
});
