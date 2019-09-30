import { RarityType } from '../interfaces/enums';

const getRarityCode = (rarity: RarityType) => {
  if (rarity === RarityType.Uncommon) return 'U';
  if (rarity === RarityType.Rare) return 'R';
  if (rarity === RarityType.MythicRare) return 'M';
  return 'C';
};

export default getRarityCode;
