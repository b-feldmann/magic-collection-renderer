import { useState } from 'react';

const STORAGE_KEY = 'mtg-funset:ActiveCardTab:v1';
const DEFAULT_TAB = 'tab-key-Card drafts / idea dump';
const VALID_TABS = new Set([
  'tab-key-All',
  DEFAULT_TAB,
  'tab-key-Cards to rate',
  'tab-key-Approved cards',
]);

export default function useActiveCardTab(): [string, (key: string) => void] {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      // Tab keys follow the tab names; older saves used title case.
      const savedTab = localStorage.getItem(STORAGE_KEY);
      const migrated =
        savedTab && `tab-key-${savedTab.slice(8, 9)}${savedTab.slice(9).toLowerCase()}`;
      return migrated && VALID_TABS.has(migrated) ? migrated : DEFAULT_TAB;
    } catch {
      return DEFAULT_TAB;
    }
  });

  const selectTab = (key: string) => {
    if (!VALID_TABS.has(key)) return;
    setActiveTab(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Tab navigation still works when browser storage is unavailable.
    }
  };

  return [activeTab, selectTab];
}
