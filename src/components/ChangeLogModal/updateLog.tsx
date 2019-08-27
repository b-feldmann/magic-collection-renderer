import React from 'react';
import { Typography } from 'antd';
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
      feature:
        'You can now add mechanics. At the bottom left is a button that opens the mechanic edit dialog. Mechanics are predefined effects that you only have to write once, but can use them on many cards. A Mechanic has a name and a description. You can render it on a card by putting the name in square brackets.'
    },
    {
      type: ChangeLogFeatureType.None,
      feature: (
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
      type: ChangeLogFeatureType.Changed,
      feature:
        'Is now working accordingly on FireFox (Why use this Browser anywhy? :p). Works also on Microsoft Edge (Not in any way better than FireFox).'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature:
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
      feature:
        'Un-secure Login. (When creating a card the creator is automatically set. Same for the annotations)'
    },
    {
      type: ChangeLogFeatureType.Changed,
      feature:
        'Cards have now different states. [Draft, To Rate, Approved]. You can change stages in the card-edit-view. There you can release any card for the rating process.'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature:
        'You can now like or dislike a card if it is in the rating process. You can approve a card if 4 people liked that card more than people disliked the card.'
    },
    {
      type: ChangeLogFeatureType.Fixed,
      feature: 'Typos'
    },
    {
      type: ChangeLogFeatureType.Added,
      feature:
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
  title: 'New Card Type Update',
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
      feature: 'You can now re-enter the access key if it was wrong.'
    }
  ]
});

// updateLog.push({
//   version: '1.1.2',
//   title: 'New Card Type Update',
//   content: [
//     {
//       type: ChangeLogFeatureType.Added,
//       feature: 'Introduce Split Cards.'
//     }
//   ]
// });

export default updateLog;
