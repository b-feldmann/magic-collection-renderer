import SmallCardInterface, { BigScryfallCardInterface } from './SmallCardInterface';

const scryfallCardToSmallCard = (card: BigScryfallCardInterface) => {
  const smallCard: SmallCardInterface = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    id: card.id,
    // eslint-disable-next-line @typescript-eslint/camelcase
    all_parts: card.all_parts,
    // eslint-disable-next-line @typescript-eslint/camelcase
    card_faces: card.card_faces,
    cmc: card.cmc,
    // eslint-disable-next-line @typescript-eslint/camelcase
    color_identity: card.color_identity,
    loyalty: card.loyalty,
    // eslint-disable-next-line @typescript-eslint/camelcase
    mana_cost: card.mana_cost,
    name: card.name,
    // eslint-disable-next-line @typescript-eslint/camelcase
    oracle_text: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    // eslint-disable-next-line @typescript-eslint/camelcase
    type_line: card.type_line,
    cover: card.image_uris ? card.image_uris.normal : '',
    art: card.image_uris ? card.image_uris.art_crop : '',
    rarity: card.rarity
  };

  return smallCard;
};

export default scryfallCardToSmallCard;
