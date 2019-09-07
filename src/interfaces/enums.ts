export function mapEnum(enumerable: any, fn: Function): any[] {
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
  Artifact = 'Artifact',
  ArtifactCreature = 'Artifact Creature',
  Land = 'Land',
  BasicLand = 'Basic Land',
  Planeswalker = 'Planeswalker',
  Emblem = 'Emblem'
}

export enum BasicLandType {
  Plains = 'Plains',
  Island = 'Island',
  Swamp = 'Swamp',
  Mountain = 'Mountain',
  Forest = 'Forest'
}

export enum RarityType {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  MythicRare = 'Mythic Rare'
}

export enum ColorType {
  White = 'white',
  Blue = 'blue',
  Black = 'black',
  Red = 'red',
  Green = 'green',
  Colorless = 'colorless',
  Gold = 'gold'
}

export enum ColorTypePlus {
  White = 'white',
  Blue = 'blue',
  Black = 'black',
  Red = 'red',
  Green = 'green',
  Colorless = 'colorless',
  Gold = 'gold',
  Land = 'land',
  Planeswalker = 'planeswalker'
}

export enum SortByType {
  Color = 'Color',
  LastUpdated = 'Last Updated',
  Creator = 'Creator'
}

export enum ChangeLogFeatureType {
  Added = 'Added',
  Changed = 'Changed',
  Deprecated = 'Deprecated',
  Removed = 'Removed',
  Fixed = 'Fixed',
  Security = 'Security',
  None = ''
}

export enum CardState {
  Draft = 'Draft',
  Rate = 'Rate',
  Approved = 'Approved'
}
