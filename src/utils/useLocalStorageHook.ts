import { useState, useEffect } from 'react';

const useLocalStorage = (
  localStorageKey: string,
  defaultValue: string = '',
  json: boolean = false
) => {
  const [value, setValue] = useState<string>(localStorage.getItem(localStorageKey) || defaultValue);

  useEffect(() => {
    localStorage.setItem(localStorageKey, value);
  }, [localStorageKey, value]);

  if (json) {
    return [
      JSON.parse(value),
      (newValue: any) => {
        setValue(JSON.stringify(newValue));
      }
    ];
  }
  return [value, setValue];
};

export default useLocalStorage;
