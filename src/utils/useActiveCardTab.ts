import { useState } from 'react';
import { CARD_TABS, tabKey } from './cardTabs';

const STORAGE_KEY = 'mtg-funset:ActiveCardTab:v1';
const DEFAULT_TAB = tabKey('Card drafts / idea dump');
const VALID_TABS = new Set(CARD_TABS.map(tab => tabKey(tab.name)));

export default function useActiveCardTab(): [string, (key: string) => void] {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      // Tab keys follow the tab names; older saves used title case.
      const savedTab = localStorage.getItem(STORAGE_KEY);
      if (savedTab && VALID_TABS.has(savedTab)) return savedTab;
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
