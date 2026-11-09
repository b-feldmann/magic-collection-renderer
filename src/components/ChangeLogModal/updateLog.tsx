import React from 'react';
import { Typography, Row } from 'antd';
import ChangeLogEntryInterface from '../../interfaces/ChangeLogEntryInterface';
import { ChangeLogFeatureType } from '../../interfaces/enums';

const { Text } = Typography;

const updateLog: ChangeLogEntryInterface[] = [];

updateLog.push({
  version: '0.0.1',
  title: 'New Usability Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'You can now sort cards by color, creator, or the time the card was last updated.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature:
        "Cards now have an indicator that shows that someone else has added them and you haven't seen them yet. Hover over the card to hide indicator.",
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature:
        'There is no longer a indicator (top-left) that shows how many cards are in the collection.',
    },
  ],
});

const exampleMechanics = ['[Enrage] do Something', '[Shadow Clone {1}]', '[Surveil 1]'];

updateLog.push({
  version: '0.1.0',
  title: 'Card Mechanic Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Mechanics',
      description: (
        <div>
          <p>
            'You can now add mechanics. At the bottom left is a button that opens the mechanic edit
            dialog. Mechanics are predefined effects that you only have to write once, but can use
            them on many cards. A Mechanic has a name and a description. You can render it on a card
            by putting the name in square brackets.'
          </p>
          <Text>Examples:</Text>
          {exampleMechanics.map(m => (
            <Text code>{m}</Text>
          ))}
        </div>
      ),
    },
  ],
});

updateLog.push({
  version: '0.2.1',
  title: 'UI Nitpicks: So much wow!',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Card Text now has a smaller font size only in collection view to support cards with long text.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Change Log UI.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Color Theme.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'More intuitive card hover.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Compact Card Editor: Only fields that are needed are shown.',
    },
  ],
});

updateLog.push({
  version: '1.0.0',
  title: 'New Major Version!',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'FireFox Bug Fix',
      description:
        'Is now working accordingly on FireFox (Why use this Browser anyway? :p). Works also on Microsoft Edge (Not in any way better than FireFox).',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Annotations',
      description:
        "Added Annotations! When editing a card you can view and write card annotations. It's recommended to add an annotation when creating a card to explain the reasoning behind that card.",
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Sort by "Last Updated" includes the last time someone added an annotation to a card.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card Sorting and Filtering are really fast now!',
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
      feature: 'Authentication',
      description:
        'Un-secure Login. (When creating a card the creator is automatically set. Same for the annotations)',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card States',
      description:
        'Cards have now different states. [Draft, To Rate, Approved]. You can change stages in the card-edit-view. There you can release any card for the rating process.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Rating',
      description:
        'You can now like or dislike a card if it is in the rating process. You can approve a card if 4 people liked that card more than people disliked the card.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Comment',
      description:
        "You can now add comments to a card. It's like a description of the meaning of that card.",
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics Editor is now more intuitive.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Introduced new Mobile Design.',
    },
  ],
});

updateLog.push({
  version: '1.1.1',
  title: 'Small Fixes',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Annotations now support mana icons and new-lines.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Added Access Key Security Patch.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Better Login',
      description: 'You can now re-enter the access key if it was wrong.',
    },
  ],
});

updateLog.push({
  version: '1.1.2',
  title: 'Mechanics Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Rewrote Mechanic Parsing and fixed some old error',
      description: (
        <div>
          <h5>Parser:</h5>
          <ul>
            <li>
              &quot;[-Miracle]&quot; is rendered as &quot;(...)&quot; without the Name of the
              mechanic
            </li>
            <li>
              &quot;[Explore]&quot; is rendered as &quot;Explore (...)&quot; with the Name of the
              mechanic
            </li>
            <li>{'"[Cycling {2}]" is rendered as "Cycling {2} (...)"'}</li>
            <li>
              {
                '"[Cycling {2}]" is rendered as "Cycling {2} ({2}, ...)" if the description of the mechanic is "{ref}, ..."'
              }
            </li>
            <li>
              {
                '"[Surveil 2]" is rendered as "Surveil 2 (... 2 ...)" if the description of the mechanic is "... {ref} ..."'
              }
            </li>
            <li>&quot;[Enrage] xyz&quot; is rendered as &quot;Enrage — ... xyz&quot;</li>
            <li>&quot;[Raid abc] xyz&quot; is rendered as &quot;Raid — abc ... xyz&quot;</li>
          </ul>
        </div>
      ),
    },
  ],
});

updateLog.push({
  version: '1.2.0',
  title: 'Rendering Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Image Uploading.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Added "Artifact Creature" and "Basic Land" card types with specialized rendering.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Smooth Image Loading',
      description:
        'Rendered cards background have three stages that are loaded subsequently: Only-Color-Background, Low-Res-Image, High-Res-Image',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Card Renderer',
      description: (
        <Row>
          <Row>Replaced card renderer with new one that works with image templates</Row>
          <Row>Special Focus on Artifacts, Planeswalker, Lands and Multi-colored spells</Row>
        </Row>
      ),
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Art Styles',
      description:
        'Renderer supports different art styles of cards (Look at you Basic Lands). Some cards can be rendered Borderless or as Invocations. (I am not kidding)',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Card Text Size',
      description: 'Text resizes now to fit into the text box',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mobile Version',
      description: 'Mobile is now VIEW-ONLY',
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature: 'LocalStorage as User info dump',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Log Rendering',
    },
  ],
});

updateLog.push({
  version: '1.2.1',
  title: 'Uploading Hot Fix',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Image Uploading',
      description:
        'Images are now separated from card and are lazy loaded just before the card is shown.',
    },
  ],
});

updateLog.push({
  version: '2.0.0',
  title: '7 years later',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Mana Icon Tooltip',
      description: 'Mana Icons in the tooltip are now fixed. Please look them up in the editor',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Add Mechanic Button',
      description: 'Streamline the addition of a mechanic on a card',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Invention Card Style',
      description: 'Artifact (Creatures) can now be rendered as Invention',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'User Handling',
      description: 'User is now stored in localstorage. Added a new switch user button',
    },
  ],
});

updateLog.push({
  version: '2.1.0',
  title: 'Usability Update',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Better Changelog',
      description: 'Changelog is looks better and is easier to dismiss',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card Saving',
      description: 'Cards are automatically saved while editing',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Theme',
      description: 'Implemented modern theme',
    },
  ],
});

updateLog.push({
  version: '2.1.1',
  title: 'Filter Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Better Filters',
      description: 'Redesign the filter sidebar.',
    },
  ],
});

updateLog.push({
  version: '2.2.0',
  title: 'Card Frame Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Added extended Artstyle',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Legendary cards now have a crown (Planeswalker not included).',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Enchantments now use the Nyx background (Nyx crown included).',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Vehicles',
      description:
        'It is now possible to mark an artifact as a vehicle. This includes the vehicle frame.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'New Card Types',
      description: 'Enchantment Creature and Token Land added.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Nicknames',
      description: 'You can give cards a nickname.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Cover Fit',
      description:
        'You can now configure if the cover image should be stretched or zoomed in to fit the frame.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Updated Card Text Editor',
      description: 'Card text no longer has multiple instructions but is a single text field.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Higher Resolution Frames',
      description: 'Also added thumbnails to increase the loading of the images',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Borderless Frame',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Mobile View',
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature: 'Invocations are temporarily disabled',
    },
  ],
});

updateLog.push({
  version: '2.2.1',
  title: 'Hotfix',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Back site of double-faced cards do not have a cost anymore',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Artefacts use correct colored pinline in all Artstyles',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Reeeeeaaaaalllyyyy long card names are now supported',
    },
  ],
});

updateLog.push({
  version: '3.0.0',
  title: 'Card Type Redesign',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'You can now choose from a list of multiple card types to enable a lot of card combinations',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Adventures (inclusive alternate art)',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Omen Cards',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Prepared Cards',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Holofoil Effect',
    },
  ],
});

updateLog.push({
  version: '3.1.0',
  title: 'Evolution Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Added Evolution (Leveler Cards)',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Added indent on card text lines that start with a --',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Border Radius on mobile cards',
    },
  ],
});

updateLog.push({
  version: '3.2.0',
  title: 'Usability Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'You can favorite cards you created yourself',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Text design',
      description: 'You can create bullet points if you start a line with * or -',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Tagging System',
      description:
        'You can now give cards a custom tag. Cards automatically have a tag if use a mechanic. You can sort cards by their tags in the collection.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Color Identity on cards without cost',
      description:
        'If no mana cost is set the color identity is derived from the card test. You can overwrite the color identity of cards without mana cost.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Uploading and deletion of custom images',
    },
  ],
});

updateLog.push({
  version: '3.2.1',
  title: 'Usability Update Hotfix',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Filter by rarity now uses symbols',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'It is now possible to have non-creature evolution cards.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'It is possible to build evolution cards with only a single evolution.',
    },
  ],
});

updateLog.push({
  version: '3.3.0',
  title: 'Card Variants Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Added Card Variants',
      description:
        'It is now possible to create a variant of a card at the top of the editor. Deleting a variant does only delete this variant and not the other variants.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Reordered mana symbols when rendering mana symbols in the card text',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Added a new indicator that shows if a new comment was added to a card',
    },
  ],
});

updateLog.push({
  version: '3.4.0',
  title: 'Card Rating',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'You can now put a card back into the Draft Pile',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mobile Rating',
      description:
        'You can now rate cards and write comment on mobile devices. Please try that out.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Current tab is stored in the browser.',
      description:
        'If you leave the page on the rating pile and come back later you will start there as well.',
    },
  ],
});

updateLog.push({
  version: '4.0.0',
  title: 'Desktop / Mobile Redesign',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'It is now possible to create and edit cards on mobile devices.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'You can react to comments ❤️.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned chat interface',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned card editor interface',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned filter interface',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned symbol guide interface',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Redesigned mechanic editor interface',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Card rating state now instantly stored',
      description:
        'Sometimes when you approved a card for rating and afterward changed the card, the card did switch back again to the card pile. This is now fixed.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Mechanic rendering works now for normal numbers.',
      description:
        '[Mechanic {1}] replaces the {ref} with {1} and [Mechanic 1] replace the {ref} with 1.',
    },
  ],
});

updateLog.push({
  version: '4.0.1',
  title: 'Concurrent Editing Patch',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card reload button that fetches the newest card changes',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Concurrent card ratings are now preserved',
      description:
        'Votes from different people no longer overwrite each other when they rate the same card.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card edits now save only the fields that changed',
      description:
        'This preserves other updates and refreshes your local copy and open editor. Unsaved edits stay in place.',
    },
  ],
});

updateLog.push({
  version: '4.1.0',
  title: 'Variants Synchronization',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Variants now share one comment thread',
      description:
        'Comments from every variant appear together. If a variant is deleted, its comments remain with the surviving variants.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Moving one variant moves the whole family between the Draft and Rate piles',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Variants created from cards in the Rate pile or Approved pile start in the same pile.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Inline text formatting and smart punctuation',
      description:
        'Use *text* for bold, _text_ for italic, and ~text~ for strikethrough in card titles, types, rules, and flavour text. Straight quotes and three dots render as curly quotes and an ellipsis; your saved text stays unchanged.',
    },
  ],
});

updateLog.push({
  version: '4.1.1',
  title: 'Mobile Filters',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Mobile filter and sort controls open in a slide-up panel so cards stay visible',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Fixed sorting by cmc',
    },
  ],
});

updateLog.push({
  version: '4.1.2',
  title: 'Mobile Order',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Makes it possible to sort the collection on mobile',
    },
  ],
});

updateLog.push({
  version: '4.2.0',
  title: 'Statistics',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Statistic Preview',
      description: 'Mana curve with color, card type and tag distribution.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Detailed Statistics',
      description: 'Detailed mana curve with color, card type, tag and rarity distribution.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Simplified evolution template',
      description:
        'If an evolution card has empty pt in a displayed level, or the pt are the same as the default pt we do not render level specific pt anymore.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Aligned font sizes, spacing, rounded edges and more.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Aligned favorite, new, and new comment indicator.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature:
        'Sometime a new card indicator was shown even if no new comment was added to a card.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Improved performance when loading the collection or filtering cards.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Added Extended and Borderless Artstyle to evolution cards.',
    },
  ],
});

updateLog.push({
  version: '4.2.1',
  title: 'Hybrid Cards',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Two-color frames for hybrid cards.',
      description:
        'Cards paid with two-color hybrid mana only now get a two-color frame instead of a gold one in the regular and extended art styles.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Hybrid mana is now ordered between its two colors.',
      description:
        'If a mana cost has symbols of exactly two colors, hybrid symbols of those colors are placed between them, e.g. {u}{ur}{r}.',
    },
  ],
});

updateLog.push({
  version: '4.2.2',
  title: 'Evolution Template',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Aligned evolution pt',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Made level indicator smaller',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Auto-fix wrong mana cost',
      description:
        'The rendering engine supported wrong mana cost (e.g. {b}2) but the statistics did not work on that. Now we automatically fix the mana costs on the card (--> {b}{2}).',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Fixed Sort "Then By"',
    },
  ],
});

updateLog.push({
  version: '4.2.3',
  title: 'Mechanic References',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics now accept any kind of reference.',
      description:
        'Numbers, mana symbols and text all render the same way, e.g. [Ravage two more] becomes Ravage two more (reminder text). Spaces in a reference are kept.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics only render with an em dash if you add -- to them.',
      description:
        'Write [Ravage -- 1] or [Ravage--1] to get Ravage — 1 followed by the reminder text. Mechanics without -- now always use parentheses, including ones followed by more text like [Enrage] do something.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Every -- now renders with exactly one space on each side of the em dash.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Reminder-only mechanics can now have a reference.',
      description:
        '[-Ravage 1] renders only the reminder text with 1 as the reference. Before, it showed the mechanic name and a dash and used -1 as the reference.',
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Detailed images no longer fail to upload.',
      description:
        'Some artwork, especially detailed square or portrait images, was too large for the server to accept and could not be saved.',
    },
  ],
});

updateLog.push({
  version: '4.2.4',
  title: 'Two-Color Cards',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Two-color cards now show both colors in the rules box.',
      description:
        'Multicolor cards with exactly two colors use the two-color rules part instead of the gold one. The title and type bars stay gold.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Hybrid evolution cards now show their colors on the level rows.',
      description:
        'The level indicators on the left use the first color and every P/T on the right uses the second color. All other multicolor evolution cards stay gold.',
    },
  ],
});

updateLog.push({
  version: '4.3.0',
  title: 'Cards by Color',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'The expanded statistics now list every card by color and rarity.',
      description:
        'Below the mana curves, each color is split into Commons, Uncommons and Rares & Mythics. Every table shows the card name, its card type, its draft role (1-Drop to 4-Drop, Late-Drop for 5+ mana, or Land), the creator and the tags, and its heading counts the cards per draft role.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Uploaded covers can be downloaded as PNG.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics with -- now join name and reference with an unspaced em dash.',
      description:
        '[Flashback -- {2}{W}] now renders as Flashback—{2}{W}, followed by the reminder text in italic parentheses.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Evolution cards with stats now always use the evolution P/T rendering.',
      description:
        'They no longer fall back to the standard P/T box when a level has empty P/T or the same P/T as the default. A missing level 1 P/T now shows as 0/0.',
    },
  ],
});

updateLog.push({
  version: '4.4.0',
  title: 'Rendering Update',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Cards now look like current (2026) printed Magic cards.',
      description:
        'Fonts, sizes and spacing were measured against official prints and adjusted to match them within a few pixels: title, mana cost, type line, set symbol, rules text, flavour text, P/T box and the bottom info lines.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Rules text is set at the printed size and only shrinks when it has to.',
      description:
        'Short texts use the full printed size and line spacing. Longer texts shrink just enough to fit while keeping the printed line and paragraph spacing, and their first line stays at the printed height, so larger text no longer sits lower in the box. Options of modal spells ("choose one —") sit closer together than regular paragraphs.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Flavour text matches print.',
      description:
        'It has the same size as the rules text, sits below a thin faded separator at the printed distance (the same at every text size), and attributions read "—Name" without a space. Trailing spaces no longer leave a gap before the closing quote, the quote after a period is kerned, and spaced ellipses (". . .") are set tighter.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'The mana cost looks like print.',
      description:
        'The symbols fill their circles like on real cards, and the circles use the lighter colors of the official mana symbols.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mana symbols in rules text are smaller and sit on the baseline.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Type lines use an em dash and the printed type order.',
      description:
        'For example "Legendary Creature — Human Wizard", "Instant — Adventure", or "Artifact Creature" no matter in which order the types were picked.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'The collector line shows the rarity and a four-digit number, like current prints.',
      description: 'For example "U 0005" instead of "005/014 U".',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'The copyright line is set in the rules text font with a printed-style ©.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Rare and mythic rare cards show the holo stamp at the bottom of the card.',
      description:
        'The stamp takes the color of the frame. Borderless cards show only the silver oval; tokens get no stamp.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Reminder and flavour text use a real italic font.',
      description: 'Italic text is now as narrow as on print, so lines wrap at the same words.',
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Higher quality cover images are now supported.',
      description:
        'Uploaded covers are kept at up to 1600 px on the longest edge (previously 360 × 510), so artwork stays sharp in the big card view. Covers uploaded before this update are still stored at the old, low resolution. We recommend uploading those again, especially the ones that look blurry.',
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Uploaded covers download in their stored format instead of PNG.',
      description:
        'The download is the stored image as is (usually WebP), so it is smaller and loses no quality.',
    },
  ],
});

export default updateLog;
