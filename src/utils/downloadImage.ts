const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

const DATA_URL_MIME = /^data:([^;,]+)[;,]/i;

// File extension of the format a data URL actually contains ('' if unknown).
export const getDataUrlExtension = (src: string): string => {
  const mime = DATA_URL_MIME.exec(src)?.[1]?.toLowerCase();
  return (mime && EXTENSIONS[mime]) || '';
};

// The stored image may be re-encoded on upload (e.g. a large PNG saved as
// WebP), so the extension follows the stored data, not the original name.
export const toDownloadFileName = (src: string, fileName?: string): string => {
  const trimmed = (fileName || '').trim();
  const extension = getDataUrlExtension(src);
  if (!extension) return trimmed || 'cover';

  const base = trimmed.replace(/\.[^./\\]*$/, '');
  return `${base || 'cover'}.${extension}`;
};

// Saves the stored image as-is: no canvas round-trip, so no quality loss and
// no size increase.
const downloadImage = (src: string, fileName?: string) => {
  const link = document.createElement('a');
  link.href = src;
  link.download = toDownloadFileName(src, fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default downloadImage;
