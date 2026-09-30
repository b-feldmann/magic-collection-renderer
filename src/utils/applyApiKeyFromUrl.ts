import { updateAccessToken } from './accessService';

export const applyApiKeyFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const key = [...params.keys()].find((name) => name.toLowerCase() === 'apikey');
  if (!key) {
    return;
  }

  const value = params.get(key) ?? '';
  if (!value) {
    return;
  }

  updateAccessToken(value);

  params.delete(key);
  const newSearch = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`,
  );
};
