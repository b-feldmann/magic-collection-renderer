export function mapEnum(enumerable: any, fn: Function): any[] {
  // get all the members of the enum
  let enumMembers: any[] = Object.keys(enumerable).map(key => enumerable[key]);

  // // we are only interested in the numeric identifiers as these represent the values
  // let enumValues: number[] = enumMembers.filter(v => typeof v === 'number');

  // now map through the enum values
  return enumMembers.map(m => fn(m));
}

export enum CardMainType {
  Creature = 'Creature',
  Artifact = 'Artifact',
  Instant = 'Instant',
  Sorcery = 'Sorcery',
  Enchantment = 'Enchantment',
  Land = 'Land',
  Planeswalker = 'Planeswalker',
  Emblem = 'Emblem'
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
  Gold = 'gold',
  Land = 'land',
  Planeswalker = 'planeswalker'
}

export enum Creators {
  UNKNOWN = 'Unknown Goomy Follower',
  Anger = 'Goomy our Anger',
  Breath = 'Goomy our Breath',
  Faith = 'Goomy our Faith',
  Greed = 'Goomy our Greed',
  Hope = 'Goomy our Hope',
  Leader = 'Goomy our Leader',
  Light = 'Goomy our Light',
  Lord = 'Goomy our Lord',
  Pledge = 'Goomy our Pledge',
  Pride = 'Goomy our Pride',
  Purity = 'Goomy our Purity',
  Soul = 'Goomy our Soul',
  Truth = 'Goomy our Truth'
}

export enum LayoutType {
  TABLE = 'Table',
  GRID = 'Grid'
}
