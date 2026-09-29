import { Emoji, EmojiProps } from 'emoji-mart';

// emoji-mart v2's `Emoji` mutates its own props object to apply defaults,
// which crashes with React 19 (element props are frozen in development).
// Render it through this wrapper that passes a fresh props copy.
const EmojiIcon = (props: EmojiProps) => Emoji({ ...props });

export default EmojiIcon;
