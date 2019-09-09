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
      feature: 'You can now sort cards by color, creator, or the time the card was last updated.'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature:
        "Cards now have an indicator that shows that someone else has added them and you haven't seen them yet. Hover over the card to hide indicator."
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature:
        'There is no longer a indicator (top-left) that shows how many cards are in the collection.'
    }
  ]
});

const exampleMechanics = ['[Enrage] do Something', '[Shadow Clone {1}]', '[Surveil 1]'];

updateLog.push({
  version: '0.1.0',
  title: 'Card Mechanic Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Mechanics',
      description:
        'You can now add mechanics. At the bottom left is a button that opens the mechanic edit dialog. Mechanics are predefined effects that you only have to write once, but can use them on many cards. A Mechanic has a name and a description. You can render it on a card by putting the name in square brackets.'
    },
    {
      type: ChangeLogFeatureType.None,
      feature: '',
      description: (
        <div>
          <Text>Examples:</Text>
          {exampleMechanics.map(m => (
            <Text code>{m}</Text>
          ))}
        </div>
      )
    }
  ]
});

updateLog.push({
  version: '0.2.1',
  title: 'UI Nitpicks: So much wow!',
  content: [
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Card Text now has a smaller font size only in collection view to support cards with long text.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Change Log UI.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Color Theme.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'More intuitive card hover.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Compact Card Editor: Only fields that are needed are shown.'
    }
  ]
});

updateLog.push({
  version: '1.0.0',
  title: 'New Major Version!',
  content: [
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'FireFox Bug Fix',
      description:
        'Is now working accordingly on FireFox (Why use this Browser anywhy? :p). Works also on Microsoft Edge (Not in any way better than FireFox).'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Annotations',
      description:
        "Added Annotations! When editing a card you can view and write card annotations. It's recommended to add an annotation when creating a card to explain the reasoning behind that card."
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Sort by "Last Updated" includes the last time someone added an annotation to a card.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card Sorting and Filtering are really fast now!'
    }
  ]
});

updateLog.push({
  version: '1.0.1',
  title: 'Awesome Yeah 👍🏼',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'You can now add emojis to your annotations.'
    }
  ]
});

updateLog.push({
  version: '1.1.0',
  title: 'Big User Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Authentication',
      description:
        'Un-secure Login. (When creating a card the creator is automatically set. Same for the annotations)'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Card States',
      description:
        'Cards have now different states. [Draft, To Rate, Approved]. You can change stages in the card-edit-view. There you can release any card for the rating process.'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Rating',
      description:
        'You can now like or dislike a card if it is in the rating process. You can approve a card if 4 people liked that card more than people disliked the card.'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Card Comment',
      description:
        "You can now add comments to a card. It's like a description of the meaning of that card."
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Mechanics Editor is now more intuitive.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Introduced new Mobile Design.'
    }
  ]
});

updateLog.push({
  version: '1.1.1',
  title: 'Small Fixes',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Annotations now support mana icons and new-lines.'
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Added Access Key Security Patch.'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'Better Login',
      description: 'You can now re-enter the access key if it was wrong.'
    }
  ]
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
      )
    }
  ]
});

updateLog.push({
  version: '1.2.0',
  title: 'Rendering Update',
  content: [
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Added "Artifact Creature" and "Basic Land" card types with specialized rendering.'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Smooth Image Loading',
      description:
        'Rendered cards background have three stages that are loaded subsequently: Only-Color-Background, Low-Res-Image, High-Res-Image'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Card Renderer',
      description: (
        <Row>
          <Row>Replaced card renderer with new one that works with image templates</Row>
          <Row>Special Focus on Artifacts, Planeswalkers, Lands and Multi-colored spells</Row>
        </Row>
      )
    },
    {
      type: ChangeLogFeatureType.Added,
      feature: 'Art Styles',
      description:
        'Renderer supports different art styles of cards (Look at you Basic Lands). Some cards can be rendered Borderless or as Invocations.'
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Card Text Size',
      description: 'Text resizes now to fit into the text box'
    },
    {
      type: ChangeLogFeatureType.Removed,
      feature: 'LocalStorage as User info dump'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature: 'New Log Rendering'
    }
  ]
});

// updateLog.push({
//   version: '1.1.3',
//   title: 'New Card Type Update',
//   content: [
//     {
//       type: ChangeLogFeatureType.Added,
//       description: 'Introduce Split Cards.'
//     }
//   ]
// });

export default updateLog;
