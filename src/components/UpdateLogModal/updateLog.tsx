import React from 'react';
import { List, Row, Typography } from 'antd';
import UpdateLogEntryInterface from '../../interfaces/UpdateLogEntryInterface';

const { Text } = Typography;

const updateLog: UpdateLogEntryInterface[] = [];

updateLog.push({
  version: 1,
  title: 'New Usability Update',
  content: (
    <List>
      <List.Item>You can now sort cards by color, creator, or the last updated time</List.Item>
      <List.Item>
        Cards now have an indicator that shows that someone else has added them and you havent seen
        them yet. Hover over the card to hide indicator
      </List.Item>
    </List>
  )
});

const exampleMechanics = ['[Enrage] do Something', '[Shadow Clone {1}]', '[Surveil 1]'];

updateLog.push({
  version: 2,
  title: 'Card Mechanic Update',
  content: (
    <List>
      <List.Item>
        You can now add mechanics. At the bottom left there is a button where you can edit the
        mechanics. Mechanics are predefined effects that you only have to write once, but you can
        use them on many cards. A Mechanic has a name and a description. You can render it on a card
        by putting the name in square brackets.
      </List.Item>
      <List.Item>
        Examples:
        {exampleMechanics.map(m => (
          <Text code>{m}</Text>
        ))}
      </List.Item>
    </List>
  )
});

export default updateLog;
