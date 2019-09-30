// @ts-ignore
import ScryfallClient from 'scryfall-client';
import SmallCardInterface from './SmallCardInterface';
import scryfallCardToSmallCard from './scryfallCardToSmallCard';

function collectCards(
  list: any,
  callBack: (cards: SmallCardInterface[]) => void,
  cards?: SmallCardInterface[]
) {
  const allCards: SmallCardInterface[] = cards ? [...cards, ...list] : [...list];

  // @ts-ignore
  callBack(allCards.map(card => scryfallCardToSmallCard(card)));

  if (!list.has_more) {
    return;
  }

  list.next().then((newList: any) => {
    collectCards(newList, callBack, allCards);
  });
}

const searchCard = (searchString: string, cardCallback: (cards: SmallCardInterface[]) => void) => {
  console.log(`search for: ${searchString}`);

  const scryfall = new ScryfallClient();
  scryfall
    .get('cards/search', {
      q: searchString
    })
    .then(function(list: any) {
      collectCards(list, cardCallback);
    })
    .catch(function(err: any) {
      cardCallback([]);
      console.log(err); // a 404 error
    });
};

export default searchCard;
