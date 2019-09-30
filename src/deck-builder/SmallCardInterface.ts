export default interface SmallCardInterface {
  id: string;

  // gameplay fields
  all_parts?: CardPart[] | null;
  card_faces?: CardFace[] | null;
  cmc: number;
  color_identity?: Color[];
  loyalty?: string | null;
  mana_cost?: string;
  name: string;
  oracle_text?: string | null;
  power?: string | null;
  toughness?: string | null;
  type_line?: string | null;

  // print fields
  cover: string;
  art: string;
  rarity: keyof typeof Rarity;
}

export interface BigScryfallCardInterface {
  object: 'card';

  // core fields
  arena_id?: number;
  id: string;
  lang: string;
  mtgo_id?: number | null;
  mtgo_foil_id?: number | null;
  multiverse_ids?: number[] | null;
  tcgplayer_id?: number | null;
  oracle_id: string;
  prints_search_uri: string;
  rulings_uri: string;
  scryfall_uri: string;
  uri: string;

  // gameplay fields
  all_parts?: CardPart[] | null;
  card_faces?: CardFace[] | null;
  cmc: number;
  colors: Color[];
  color_identity: Color[];
  color_indicator?: Color[] | null;
  edhrec_rank?: number | null;
  foil: boolean;
  hand_modifier?: string | null;
  life_modifier?: string | null;
  loyalty?: string | null;
  mana_cost?: string;
  name: string;
  nonfoil: boolean;
  oracle_text?: string | null;
  oversized: boolean;
  power?: string | null;
  reserved: boolean;
  toughness?: string | null;
  type_line?: string | null;

  // print fields
  artist?: string | null;
  collector_number: string;
  digital: boolean;
  flavor_text?: string | null;
  frame: 1993 | 1997 | 2003 | 2015 | 'Future';
  full_art: boolean;
  highres_image: boolean;
  illustration_id?: string | null;
  image_uris?: ImageUris | null;
  prices: Prices;
  printed_name?: string | null;
  printed_text?: string | null;
  printed_type_line?: string | null;
  promo: boolean;
  purchase_uris: PurchaseUris;
  rarity: keyof typeof Rarity;
  related_uris: RelatedUris;
  released_at: string;
  reprint: boolean;
  scryfall_set_uri: string;
  set_name: string;
  set_search_uri: string;
  set_uri: string;
  set: string;
  story_spotlight: boolean;
  watermark?: string | null;
}

export interface RelatedUris {
  gatherer?: string;
  tcgplayer_decks?: string;
  edhrec?: string;
  mtgtop8?: string;
  [key: string]: string | undefined;
}

export interface CardPart {
  id: string;
  name: string;
  uri: string;
}

export interface ImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

enum Rarity {
  common,
  uncommon,
  rare,
  mythic,
}

enum Color {
  W = 'W',
  B = 'B',
  R = 'R',
  U = 'U',
  G = 'G'
}

export interface Prices {
  usd: string | null;
  usd_foil: string | null;
  eur: string | null;
  tix: string | null;
}

export interface PurchaseUris {
  amazon?: string;
  ebay?: string;
  tcgplayer?: string;
  magiccardmarket?: string;
  cardhoarder?: string;
  card_kingdom?: string;
  mtgo_traders?: string;
  coolstuffinc?: string;
  [key: string]: string | undefined;
}

export interface CardFace {
  object: 'card_face';

  artist?: string | null;
  color_indicator?: Color[] | null;
  colors: Color[];
  flavor_text?: string | null;
  illustration_id?: string | null;
  image_uris?: ImageUris | null;
  loyalty?: string | null;
  mana_cost: string;
  name: string;
  oracle_text?: string | null;
  power?: string | null;
  printed_name?: string | null;
  printed_text?: string | null;
  printed_type_line?: string | null;
  toughness?: string | null;
  type_line: string;
  watermark?: string | null;
}
