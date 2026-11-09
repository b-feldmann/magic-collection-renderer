import { describe, it, expect } from 'vitest';
import { toPngFileName } from './downloadImageAsPng';

describe('toPngFileName', () => {
  it('replaces the original extension with .png', () => {
    expect(toPngFileName('colin_hennerz.jpg')).toBe('colin_hennerz.png');
    expect(toPngFileName('art.v2.jpeg')).toBe('art.v2.png');
  });

  it('keeps names without an extension', () => {
    expect(toPngFileName('artwork')).toBe('artwork.png');
  });

  it('falls back to a default name', () => {
    expect(toPngFileName('')).toBe('cover.png');
    expect(toPngFileName(undefined)).toBe('cover.png');
  });
});
