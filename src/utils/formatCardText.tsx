import React from 'react';

const INLINE_STYLES = [
  { marker: '*', tag: 'strong' },
  { marker: '_', tag: 'em' },
  { marker: '~', tag: 's' },
].map(({ marker, tag }) => ({
  tag,
  // Doubled delimiters are literal. Spaces immediately inside a delimiter
  // aren't formatting (in particular, a standalone ~ remains a name reference).
  pattern: new RegExp(
    `(?<!\\${marker})\\${marker}(?!\\${marker})(\\S(?:.*?\\S)?)\\${marker}(?!\\${marker})`,
  ),
}));

export const smartPunctuation = (text: string): string => {
  let previous = '';
  return text.replace(/\.\.\.|[\s\S]/g, character => {
    let replacement = character;
    if (character === '...') replacement = '…';
    if (character === '"' || character === "'") {
      const opening = !previous || /[\s([{—“‘]/.test(previous);
      replacement = character === '"' ? (opening ? '“' : '”') : opening ? '‘' : '’';
    }
    // Formatting delimiters shouldn't change which way a quote faces.
    if (!/^[*_~]$/.test(character)) previous = replacement;
    return replacement;
  });
};

const plainText = (text: string): React.ReactNode => text;

/** Render only our inline syntax; never interpret user text as HTML. */
export const formatCardText = (
  text: string,
  renderText: (text: string) => React.ReactNode = plainText,
): React.ReactNode => {
  const parse = (remaining: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    while (remaining) {
      const matches = INLINE_STYLES.flatMap(({ pattern, tag }) => {
        const match = pattern.exec(remaining);
        return match ? [{ match, tag }] : [];
      });
      const first = matches.reduce<(typeof matches)[number] | undefined>(
        (earliest, candidate) =>
          !earliest || candidate.match.index < earliest.match.index ? candidate : earliest,
        undefined,
      );
      if (!first) {
        parts.push(renderText(remaining));
        break;
      }
      const { match, tag } = first;
      if (match.index) parts.push(renderText(remaining.slice(0, match.index)));
      parts.push(React.createElement(tag, { key: parts.length }, parse(match[1])));
      remaining = remaining.slice(match.index + match[0].length);
    }
    return parts;
  };
  return parse(smartPunctuation(text));
};
