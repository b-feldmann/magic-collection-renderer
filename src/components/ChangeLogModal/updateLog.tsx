import ChangeLogEntryInterface from '../../interfaces/ChangeLogEntryInterface';
import { ChangeLogFeatureType } from '../../interfaces/enums';

// Do not remove or reorder entries: the last seen changelog is stored as an index into this list.
const updateLog: ChangeLogEntryInterface[] = [];

updateLog.push({
  version: '0.0.1',
  title: 'New Usability Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Sort cards by color, creator or the time they were last updated.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'New cards from other people are marked until you hover over them.',
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature: 'The card counter in the top-left corner.',
    },
  ],
});

updateLog.push({
  version: '0.1.0',
  title: 'Card Mechanic Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Mechanics',
      description:
        'Mechanics are predefined effects with a name and a description. Write them once in the mechanic editor (bottom left) and use them on any card by putting the name in square brackets, e.g. [Enrage] do something, [Shadow Clone {1}] or [Surveil 1].',
    },
  ],
});

updateLog.push({
  version: '0.2.1',
  title: 'UI Nitpicks: So much wow!',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New color theme, change log and a more intuitive card hover.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Compact card editor that only shows the fields you need.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Smaller card text in the collection view so long texts fit.',
    },
  ],
});

updateLog.push({
  version: '1.0.0',
  title: 'New Major Version!',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Annotations',
      description:
        'View and write annotations while editing a card. Add one when creating a card to explain the reasoning behind it.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Sorting and filtering are much faster, and "Last Updated" includes new annotations.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'The app now works on Firefox and Edge.',
    },
  ],
});

updateLog.push({
  version: '1.0.1',
  title: 'Awesome Yeah 👍🏼',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'You can now add emojis to your annotations.',
    },
  ],
});

updateLog.push({
  version: '1.1.0',
  title: 'Big User Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Login',
      description: 'The creator of cards and annotations is set automatically.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card States and Rating',
      description:
        'Cards are Draft, To Rate or Approved. Cards in the rating process can be liked or disliked and are approved once they have 4 more likes than dislikes.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Comments on cards.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New mobile design and a more intuitive mechanics editor.',
    },
  ],
});

updateLog.push({
  version: '1.1.1',
  title: 'Small Fixes',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Annotations support mana icons and line breaks.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Access key security patch. A wrong key can now be re-entered.',
    },
  ],
});

updateLog.push({
  version: '1.1.2',
  title: 'Mechanics Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Rewrote mechanic parsing and fixed old errors.',
      description:
        '[-Miracle] renders only the reminder text, [Cycling {2}] passes {2} into the reminder text, and [Enrage] xyz renders as an ability word: Enrage — xyz.',
    },
  ],
});

updateLog.push({
  version: '1.2.0',
  title: 'Rendering Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Card Renderer',
      description:
        'Template-based renderer with special focus on artifacts, planeswalkers, lands and multicolored spells. Text resizes to fit the text box.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Art Styles and Card Types',
      description:
        'Borderless and Invocation art styles, plus Artifact Creature and Basic Land card types.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Image uploads with smooth loading from color to low-res to high-res.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mobile is now view-only.',
    },
  ],
});

updateLog.push({
  version: '1.2.1',
  title: 'Uploading Hot Fix',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Images are stored separately and lazy loaded just before a card is shown.',
    },
  ],
});

updateLog.push({
  version: '2.0.0',
  title: '7 years later',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Artifacts and artifact creatures can be rendered as Inventions.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'An "Add Mechanic" button to quickly add a mechanic to a card.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'The user is remembered in the browser and can be switched.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Mana icon tooltip.',
    },
  ],
});

updateLog.push({
  version: '2.1.0',
  title: 'Usability Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Cards are saved automatically while editing.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Modern theme and a nicer, easier to dismiss changelog.',
    },
  ],
});

updateLog.push({
  version: '2.1.1',
  title: 'Filter Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned filter sidebar.',
    },
  ],
});

updateLog.push({
  version: '2.2.0',
  title: 'Card Frame Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'New Frames',
      description:
        'Extended art style, a new borderless frame, crowns for legendary cards and Nyx backgrounds for enchantments. All frames are in higher resolution with thumbnails for faster loading.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'New Card Types',
      description: 'Vehicles, Enchantment Creatures and Token Lands.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card nicknames and a setting to stretch or zoom the cover image.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card text is a single text field.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Mobile view.',
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature: 'Invocations are temporarily disabled.',
    },
  ],
});

updateLog.push({
  version: '2.2.1',
  title: 'Hotfix',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature:
        'Back faces of double-faced cards have no cost, artifacts use the right pinline and very long names fit.',
    },
  ],
});

updateLog.push({
  version: '3.0.0',
  title: 'Card Type Redesign',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Choose multiple card types to build almost any card combination.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Adventure (with alternate art), Omen and Prepared cards.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Holofoil effect.',
    },
  ],
});

updateLog.push({
  version: '3.1.0',
  title: 'Evolution Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Evolution (leveler) cards.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card text lines starting with -- are indented.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Rounded corners on mobile cards.',
    },
  ],
});

updateLog.push({
  version: '3.2.0',
  title: 'Usability Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Tags',
      description:
        'Give cards custom tags and sort by them. Cards are tagged automatically with the mechanics they use.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Favorite your own cards, and start lines with * or - for bullet points.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Cards without mana cost get their color identity from the card text.',
      description: 'You can overwrite it in the editor.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Uploading and deleting custom images.',
    },
  ],
});

updateLog.push({
  version: '3.2.1',
  title: 'Usability Update Hotfix',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'The rarity filter uses symbols.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Evolution cards can be non-creatures and have a single evolution.',
    },
  ],
});

updateLog.push({
  version: '3.3.0',
  title: 'Card Variants Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Variants',
      description:
        'Create a variant at the top of the editor. Deleting a variant keeps the other variants.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'An indicator for new comments.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mana symbols in card text are ordered correctly.',
    },
  ],
});

updateLog.push({
  version: '3.4.0',
  title: 'Card Rating',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Rate and comment on cards on mobile.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Put a card back into the Draft pile.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'The last opened tab is remembered when you come back.',
    },
  ],
});

updateLog.push({
  version: '4.0.0',
  title: 'Desktop / Mobile Redesign',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Create and edit cards on mobile.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'React to comments ❤️.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned chat, card editor, filters, symbol guide and mechanic editor.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Cards no longer jump back to the Draft pile after editing.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Mechanics work with plain numbers, e.g. [Mechanic 1].',
    },
  ],
});

updateLog.push({
  version: '4.0.1',
  title: 'Concurrent Editing Patch',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Simultaneous edits and votes no longer overwrite each other.',
      description: 'Only changed fields are saved, and unsaved edits stay in place.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'A reload button to fetch the newest version of a card.',
    },
  ],
});

updateLog.push({
  version: '4.1.0',
  title: 'Variants Synchronization',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Variants are kept together.',
      description:
        'They share one comment thread, move between the Draft and Rate piles together, and new variants start in the same pile.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Text formatting and smart punctuation',
      description:
        'Use *bold*, _italic_ and ~strikethrough~ in card text. Straight quotes and three dots render as curly quotes and an ellipsis.',
    },
  ],
});

updateLog.push({
  version: '4.1.1',
  title: 'Mobile Filters',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Filters and sorting on mobile open in a slide-up panel.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Sorting by mana value.',
    },
  ],
});

updateLog.push({
  version: '4.1.2',
  title: 'Mobile Order',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Sort the collection on mobile.',
    },
  ],
});

updateLog.push({
  version: '4.2.0',
  title: 'Statistics',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Statistics',
      description:
        'A preview and a detailed view with the mana curve and the color, card type, tag and rarity distribution.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Aligned font sizes, spacing, corners and card indicators.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Evolution cards support the extended and borderless art styles.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Faster loading and filtering, and no more false new-comment indicators.',
    },
  ],
});

updateLog.push({
  version: '4.2.1',
  title: 'Hybrid Cards',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Cards with only two-color hybrid mana get a two-color frame instead of gold.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Hybrid mana is placed between its two colors, e.g. {u}{ur}{r}.',
    },
  ],
});

updateLog.push({
  version: '4.2.2',
  title: 'Evolution Template',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Aligned evolution P/T and smaller level indicators.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Malformed mana costs like {b}2 are corrected to {b}{2}.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Sorting with "Then By".',
    },
  ],
});

updateLog.push({
  version: '4.2.3',
  title: 'Mechanic References',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics accept any reference.',
      description:
        'Numbers, mana symbols and text all work, e.g. [Ravage two more]. Write [Ravage -- 1] to get an em dash; without -- the reminder text is in parentheses.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Reminder-only mechanics like [-Ravage 1] can have a reference.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Large, detailed images upload correctly.',
    },
  ],
});

updateLog.push({
  version: '4.2.4',
  title: 'Two-Color Cards',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Two-color cards show both colors in the rules box.',
      description: 'The title and type bars stay gold.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Hybrid evolution cards show their two colors on the level rows.',
    },
  ],
});

updateLog.push({
  version: '4.3.0',
  title: 'Cards by Color',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card tables in the statistics',
      description:
        'Every color is split by rarity and lists each card with its type, draft role, creator and tags.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Uploaded covers can be downloaded.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics with -- render like print, e.g. Flashback—{2}{W}.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Evolution cards with stats always use the evolution P/T layout.',
    },
  ],
});

updateLog.push({
  version: '4.4.0',
  title: 'Rendering Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Cards now look like current printed Magic cards.',
      description:
        'Fonts, sizes and spacing of the title, mana cost, type line, rules text, P/T box and info lines were matched to official prints.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Rules and flavour text are set like print.',
      description:
        'Text uses the printed size and only shrinks when it has to. Reminder and flavour text use a real italic font, and flavour text sits below a thin separator.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Printed type order with an em dash, and a print-style collector line like "U 0005".',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: '-- no longer adds spaces around the em dash.',
      description:
        'Write Ward--Pay 3 life for "Ward—Pay 3 life" like print, and add spaces yourself where you want them, e.g. choose one -- .',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Rare and mythic cards get a holo stamp in the color of the frame.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Sharper cover images.',
      description:
        'Covers are stored at up to 1600 px and download in their original format. Please re-upload older covers that look blurry.',
    },
  ],
});

updateLog.push({
  version: '4.5.0',
  title: 'Rendering Hotfix + Card Downloads',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Cards are now rendered equally on mobile, desktop, in the grid and in the modal',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Cards can be downloaded as png',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Gallery can be downloaded as printable pdf with cut marks',
    },
  ],
});

export default updateLog;
