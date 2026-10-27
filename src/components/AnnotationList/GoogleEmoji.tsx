import { getGoogleEmojiStyle, splitGoogleEmoji } from './googleEmojiData';

const GoogleEmoji = ({ emoji, decorative = true }: { emoji: string; decorative?: boolean }) => {
  const style = getGoogleEmojiStyle(emoji);
  if (!style) return <span aria-hidden={decorative || undefined}>{emoji}</span>;

  return (
    <span
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : emoji}
      style={style}
    >
      {!decorative && (
        <span aria-hidden="true" style={{ opacity: 0 }}>
          {emoji}
        </span>
      )}
    </span>
  );
};

export const GoogleEmojiText = ({ text }: { text: string }) =>
  splitGoogleEmoji(text).map((part, index) =>
    getGoogleEmojiStyle(part) ? <GoogleEmoji key={index} emoji={part} decorative={false} /> : part,
  );

export default GoogleEmoji;
