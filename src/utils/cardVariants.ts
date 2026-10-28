import CardInterface from '../interfaces/CardInterface';
import AnnotationInterface from '../interfaces/AnnotationInterface';
import AnnotationAccessorInterface from '../interfaces/AnnotationAccessorInterface';

// Editor drafts may predate family changes; membership belongs to the latest store.
export const withLatestVariantIds = (
  snapshot: CardInterface,
  cards: CardInterface[],
): CardInterface => {
  const latest = cards.find(card => card.uuid === snapshot.uuid);
  return latest ? { ...snapshot, variantIds: latest.variantIds?.slice() } : snapshot;
};

export const getVariantGroups = (
  cards: CardInterface[],
  allCards: CardInterface[] = cards,
): CardInterface[][] => {
  const byId = new Map(allCards.map(card => [card.uuid, card]));
  cards.forEach(card => byId.set(card.uuid, card));
  const neighbors = new Map<string, Set<string>>();
  byId.forEach(card => neighbors.set(card.uuid, new Set()));
  byId.forEach(card => {
    for (const id of card.variantIds || []) {
      if (id === card.uuid || !byId.has(id)) continue;
      neighbors.get(card.uuid)!.add(id);
      neighbors.get(id)!.add(card.uuid);
    }
  });

  const visited = new Set<string>();
  const groups: CardInterface[][] = [];
  for (const card of cards) {
    if (visited.has(card.uuid)) continue;
    const pending = [card.uuid];
    const group: CardInterface[] = [];
    visited.add(card.uuid);
    while (pending.length) {
      const id = pending.pop()!;
      group.push(byId.get(id)!);
      for (const neighbor of neighbors.get(id)!) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        pending.push(neighbor);
      }
    }
    group.sort((a, b) => a.meta.createdAt - b.meta.createdAt || a.uuid.localeCompare(b.uuid));
    groups.push(group);
  }
  return groups;
};

export const getVariantFamily = (card: CardInterface, cards: CardInterface[]): CardInterface[] =>
  getVariantGroups([card], cards)[0];

export const getNextVariantId = (cardUuid: string, cards: CardInterface[]): string | undefined => {
  const card = cards.find(member => member.uuid === cardUuid);
  if (!card) return undefined;
  const family = getVariantFamily(card, cards);
  if (family.length < 2) return undefined;
  const index = family.findIndex(member => member.uuid === cardUuid);
  return family[(index + 1) % family.length].uuid;
};

export const getVariantAnnotations = (
  family: CardInterface[],
  annotationAccessor: AnnotationAccessorInterface,
): AnnotationInterface[] => {
  const annotations = new Map<string, AnnotationInterface>();
  family.forEach(card =>
    (annotationAccessor[card.uuid] || []).forEach(annotation =>
      annotations.set(annotation.uuid, annotation),
    ),
  );
  return [...annotations.values()];
};
