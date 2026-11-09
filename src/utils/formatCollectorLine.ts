/**
 * First collector-info line of current (2023+) prints: the rarity letter, then
 * the collector number padded to four digits, without the set size
 * ("U 0005", "L 0272").
 */
const formatCollectorLine = (collectionNumber: number, rarityCode: string): string =>
  `${rarityCode} ${String(Math.max(0, Math.trunc(collectionNumber) || 0)).padStart(4, '0')}`;

export default formatCollectorLine;
