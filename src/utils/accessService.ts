import dropboxAccess from './dropbox-fetch-axios';

const LOCALSTORAGE_KEY = 'api_key';

dropboxAccess.setToken(localStorage.getItem(LOCALSTORAGE_KEY) || '');

export const updateAccessToken = (token: string) => {
  localStorage.setItem(LOCALSTORAGE_KEY, token);
  dropboxAccess.setToken(token);
};

export const deleteAccessToken = () => {
  localStorage.setItem(LOCALSTORAGE_KEY, '');
  dropboxAccess.setToken('');
};

export const getAccessToken = () => {
  return localStorage.getItem(LOCALSTORAGE_KEY) || '';
};

export const hasAccessToken = (): boolean => {
  return !!localStorage.getItem(LOCALSTORAGE_KEY);
};

export const getDropboxInstance = () => {
  dropboxAccess.setToken(localStorage.getItem(LOCALSTORAGE_KEY) || '');
  return dropboxAccess;
};
