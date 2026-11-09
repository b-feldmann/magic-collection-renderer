import { describe, it, expect } from 'vitest';
import { getDataUrlExtension, toDownloadFileName } from './downloadImage';

describe('getDataUrlExtension', () => {
  it('reads the format of a data URL', () => {
    expect(getDataUrlExtension('data:image/webp;base64,xx')).toBe('webp');
    expect(getDataUrlExtension('data:image/jpeg;base64,xx')).toBe('jpg');
    expect(getDataUrlExtension('data:image/PNG;base64,xx')).toBe('png');
  });

  it('returns nothing for unknown formats or non-data URLs', () => {
    expect(getDataUrlExtension('data:application/octet-stream;base64,xx')).toBe('');
    expect(getDataUrlExtension('https://example.com/a.png')).toBe('');
  });
});

describe('toDownloadFileName', () => {
  it('uses the extension of the stored format', () => {
    expect(toDownloadFileName('data:image/webp;base64,xx', 'art.png')).toBe('art.webp');
    expect(toDownloadFileName('data:image/jpeg;base64,xx', 'art.v2.jpeg')).toBe('art.v2.jpg');
  });

  it('adds an extension to names without one', () => {
    expect(toDownloadFileName('data:image/webp;base64,xx', 'artwork')).toBe('artwork.webp');
  });

  it('falls back to a default name', () => {
    expect(toDownloadFileName('data:image/png;base64,xx', '')).toBe('cover.png');
    expect(toDownloadFileName('data:image/png;base64,xx')).toBe('cover.png');
  });

  it('keeps the original name when the format is unknown', () => {
    expect(toDownloadFileName('data:application/octet-stream;base64,xx', 'art.tif')).toBe(
      'art.tif',
    );
  });
});
