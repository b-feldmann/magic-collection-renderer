// @ts-ignore
import SpellChecker from 'simple-spellchecker';

export const getSuggestions = (
  word: string,
  suggenstionCallback: (suggestions: string[]) => void
) => {
  SpellChecker.getDictionarySync('en-EN', function(err: any, dictionary: any) {
    if (!err) {
      const misspelled = !dictionary.spellCheck(word);
      if (misspelled) {
        const suggestions: string[] = dictionary.getSuggestions(word);
        suggenstionCallback(suggestions);
      }
    }

    suggenstionCallback([]);
  });
};
