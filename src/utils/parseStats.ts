const parseStats = (cardStats?: string): { power: string; toughness: string } => {
  if (!cardStats) return { power: '0', toughness: '0' };

  const split = cardStats.split('/');
  if (split.length > 2) return { power: '0', toughness: '0' };
  if (split.length === 1) return { power: split[0], toughness: '0' };

  return { power: split[0] || '0', toughness: split[1] || '0' };
};

export default parseStats;
