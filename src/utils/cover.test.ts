import { describe, it, expect } from 'vitest';

import {
  getCoverFileName,
  getCoverImageData,
  getCoverImageSrc,
  isUploadedCover,
  toLoadingCover,
} from './cover';

describe('cover value format', () => {
  it('round-trips an uploaded cover with its file name', () => {
    const value = 'base64:pic.jpg|data:image/jpeg;base64,abc';

    expect(getCoverFileName(value)).toBe('pic.jpg');
    expect(getCoverImageData(value)).toBe('data:image/jpeg;base64,abc');
    expect(getCoverImageSrc(value)).toBe('data:image/jpeg;base64,abc');
    expect(isUploadedCover(value)).toBe(true);
  });

  it('treats legacy uploaded covers without a file name as data only', () => {
    const value = 'base64:data:image/jpeg;base64,abc';

    expect(getCoverFileName(value)).toBe('');
    expect(getCoverImageData(value)).toBe('data:image/jpeg;base64,abc');
    expect(getCoverImageSrc(value)).toBe('data:image/jpeg;base64,abc');
    expect(isUploadedCover(value)).toBe(true);
  });

  it('keeps the file name on a loading cover', () => {
    const value = toLoadingCover('pic.jpg');

    expect(value).toBe('loading:pic.jpg');
    expect(getCoverFileName(value)).toBe('pic.jpg');
    expect(getCoverImageSrc(value)).toBe('');
    expect(isUploadedCover(value)).toBe(true);
  });

  it('handles a loading cover without a file name', () => {
    expect(toLoadingCover('')).toBe('loading');
    expect(getCoverFileName('loading')).toBe('');
    expect(getCoverImageSrc('loading')).toBe('');
    expect(isUploadedCover('loading')).toBe(true);
  });

  it('strips the url: prefix for rendering', () => {
    expect(getCoverImageSrc('url:https://example.com/x.jpg')).toBe('https://example.com/x.jpg');
    expect(isUploadedCover('url:https://example.com/x.jpg')).toBe(false);
    expect(getCoverFileName('url:https://example.com/x.jpg')).toBe('');
  });

  it('returns nothing for an empty cover', () => {
    expect(getCoverImageSrc('')).toBe('');
    expect(getCoverFileName('')).toBe('');
    expect(getCoverImageData('')).toBe('');
    expect(isUploadedCover('')).toBe(false);
    expect(isUploadedCover(undefined)).toBe(false);
  });
});
