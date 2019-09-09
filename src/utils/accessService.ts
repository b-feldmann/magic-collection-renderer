const LOCALSTORAGE_KEY = 'api_key';

export const updateAccessToken = (token: string) => {
  localStorage.setItem(LOCALSTORAGE_KEY, token);
};

export const deleteAccessToken = () => {
  localStorage.setItem(LOCALSTORAGE_KEY, '');
};

export const getAccessToken = () => {
  return localStorage.getItem(LOCALSTORAGE_KEY) || '';
};

export const hasAccessToken = (): boolean => {
  return !!localStorage.getItem(LOCALSTORAGE_KEY);
};
