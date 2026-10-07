export function mapEnum(enumerable: any, fn: (...args: any[]) => any): any[] {
  // get all the members of the enum
  const enumMembers: any[] = Object.keys(enumerable).map(key => enumerable[key]);

  // // we are only interested in the numeric identifiers as these represent the values
  // let enumValues: number[] = enumMembers.filter(v => typeof v === 'number');

  // now map through the enum values
  return enumMembers.map(m => fn(m));
}

export enum CardMainType {
  Creature = 'Creature',
  Instant = 'Instant',
  Sorcery = 'Sorcery',
  Enchantment = 'Enchantment',
  EnchantmentCreature = 'Enchantment Creature',
  Artifact = 'Artifact',
  ArtifactCreature = 'Artifact Creature',
  CreatureToken = 'Creature Token',
  ArtifactToken = 'Artifact Token',
  TokenLand = 'Token Land',
  Land = 'Land',
  BasicLand = 'Basic Land',
  Planeswalker = 'Planeswalker',
  Emblem = 'Emblem',
}

export enum BasicLandType {
  Plains = 'Plains',
  Island = 'Island',
  Swamp = 'Swamp',
  Mountain = 'Mountain',
  Forest = 'Forest',
}

export enum RarityType {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  MythicRare = 'Mythic Rare',
}

export enum ColorType {
  White = 'white',
  Blue = 'blue',
  Black = 'black',
  Red = 'red',
  Green = 'green',
  Colorless = 'colorless',
  Gold = 'gold',
}

export enum SortByType {
  Color = 'Color',
  LastUpdated = 'Last Updated',
  Creator = 'Creator',
  Rarity = 'Rarity',
  ManaCost = 'Mana Cost',
  Name = 'Name',
}

export enum ChangeLogFeatureType {
  Added = 'Added',
  Changed = 'Changed',
  Deprecated = 'Deprecated',
  Removed = 'Removed',
  Fixed = 'Fixed',
  Security = 'Security',
  None = '',
}

export enum CardState {
  Draft = 'Draft',
  Rate = 'Rate',
  Approved = 'Approved',
}

export enum CardArtStyles {
  Regular = 'Regular',
  Extended = 'Extended',
  Borderless = 'Borderless',
  Invocation = 'Invocation',
  Invention = 'Invention',
}

export enum SplitArtStyles {
  Regular = 'Regular',
  ExplorationDestination = 'Exploration // Destination',
}

export enum BasicLandArtStyles {
  Regular = 'Regular',
  FullArt = 'Full Art',
  Unstable = 'Unstable',
}

export enum CoverFit {
  Stretch = 'Stretch',
  Zoom = 'Zoom',
}
