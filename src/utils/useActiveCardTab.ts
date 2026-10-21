import { useState } from 'react';

const STORAGE_KEY = 'mtg-funset:ActiveCardTab:v1';
const DEFAULT_TAB = 'tab-key-Card Drafts / Idea Dump';
const VALID_TABS = new Set([
  'tab-key-All',
  DEFAULT_TAB,
  'tab-key-Cards to Rate',
  'tab-key-Approved Cards',
]);

export default function useActiveCardTab(): [string, (key: string) => void] {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem(STORAGE_KEY);
      return savedTab && VALID_TABS.has(savedTab) ? savedTab : DEFAULT_TAB;
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
