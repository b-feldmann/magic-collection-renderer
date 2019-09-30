import React from 'react';
import { Route, Switch } from 'react-router-dom';

import Editor from './components/Editor';
import DeckChooser from './components/DeckChooser';

const DeckBuilderApp = () => {
  return (
    <Switch>
      <Route path="/deck-builder/edit">
        <Editor />
      </Route>
      <Route path="/deck-builder">
        <DeckChooser />
      </Route>
    </Switch>
  );
};

export default DeckBuilderApp;
