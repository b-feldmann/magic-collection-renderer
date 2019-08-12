import { useState, useEffect } from 'react';

const useLocalStorage = (
  localStorageKey: string,
  defaultValue: string = ''
) => {
  const [value, setValue] = useState<string>(
    localStorage.getItem(localStorageKey) || defaultValue
  );

  useEffect(() => {
    localStorage.setItem(localStorageKey, value);
  }, [value]);

  return [value, setValue];
};

export default useLocalStorage;
