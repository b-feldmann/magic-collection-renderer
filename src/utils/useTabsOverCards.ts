import { useLayoutEffect, useRef } from 'react';

const ATTRIBUTE = 'data-tabs-over-cards';

/**
 * Marks the element holding the collection tabs while the active tab's grid is
 * scrolled, so CSS can lift the tabs off the cards passing under them.
 *
 * This writes to the DOM from the scroll handler instead of going through state:
 * a state update would re-render the whole app, and the shadow would lag behind
 * the scroll.
 */
export default function useTabsOverCards(activeTabKey: string) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrolledTabs = useRef<Record<string, boolean>>({});

  useLayoutEffect(() => {
    hostRef.current?.toggleAttribute(ATTRIBUTE, !!scrolledTabs.current[activeTabKey]);
  }, [activeTabKey]);

  const reportScrolled = (tabKey: string, scrolled: boolean) => {
    scrolledTabs.current[tabKey] = scrolled;
    if (tabKey === activeTabKey) hostRef.current?.toggleAttribute(ATTRIBUTE, scrolled);
  };

  return { hostRef, reportScrolled };
}
