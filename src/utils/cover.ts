// Cover values are prefixed strings stored on the card face:
//
//   ''                           — no cover set
//   'url:<url>'                  — external image URL
//   'base64:[<name>|]<data>'     — uploaded image held locally while editing
//                                  (the file name is persisted with the value
//                                  so the editor can show it after a reload;
//                                  legacy values have no name segment)
//   'loading' | 'loading:<name>' — uploaded image persisted in the middleware's
//                                  images collection (fetched back as base64)
//
// The image data itself never goes into the card document: `updateCard` sends
// the card with a `loading…` cover and uploads the data to the `/images`
// endpoint keyed by card UUID + face.

// Raw image data of an uploaded cover (ready for the `/images` endpoint).
export const getCoverImageData = (value?: string): string => {
  if (!value || !value.startsWith('base64:')) return '';

  const rest = value.substring(7);
  const separator = rest.indexOf('|');
  return separator === -1 ? rest : rest.substring(separator + 1);
};

// Persisted file name of an uploaded cover ('' when unknown).
export const getCoverFileName = (value?: string): string => {
  if (!value) return '';

  if (value.startsWith('base64:')) {
    const rest = value.substring(7);
    const separator = rest.indexOf('|');
    return separator === -1 ? '' : rest.substring(0, separator);
  }
  if (value.startsWith('loading:')) return value.substring(8);

  return '';
};

// True while the cover is an uploaded image — the editor must not offer the
// URL input for these.
export const isUploadedCover = (value?: string): boolean =>
  !!value && (value.startsWith('base64:') || value.startsWith('loading'));

// True when the image data still has to be fetched from the images collection.
export const isLoadingCover = (value?: string): boolean =>
  !!value && (value === 'loading' || value.startsWith('loading:'));

// Cover value for a card whose image data was moved to the images collection;
// keeps the file name for the UI.
export const toLoadingCover = (name: string): string => (name ? `loading:${name}` : 'loading');

// Src usable in an <img> ('' while an uploaded image is not loaded yet).
export const getCoverImageSrc = (value?: string): string => {
  if (!value) return '';
  if (value === 'loading' || value.startsWith('loading:')) return '';
  if (value.startsWith('url:')) return value.substring(4);
  if (value.startsWith('base64:')) return getCoverImageData(value);

  return value;
};
