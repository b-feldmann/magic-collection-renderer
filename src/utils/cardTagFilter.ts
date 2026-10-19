export interface CardWithTags {
  tags?: string[];
}

export interface AvailableCardTag {
  name: string;
  count: number;
}

export const getInitialTagFilterState = (tags: string[]): Record<string, boolean> =>
  Object.fromEntries(tags.map(tag => [tag, false]));

export const getAvailableCardTags = (
  cards: CardWithTags[],
  availableTags: string[],
): AvailableCardTag[] => {
  const counts = new Map<string, number>();

  cards.forEach(card => {
    new Set(card.tags || []).forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
  });

  return availableTags
    .filter(tag => counts.has(tag))
    .map(name => ({ name, count: counts.get(name)! }));
};

export const matchesSelectedTags = (cardTags: string[], selectedTags: string[]): boolean =>
  selectedTags.length === 0 || selectedTags.some(tag => cardTags.includes(tag));
