import React from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';
import ReactDOM from 'react-dom';

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

import { BrowserView, MobileView } from 'react-device-detect';

import './index.css';
import App from './custom-set/App';
import MobileApp from './custom-set/MobileApp';
import * as serviceWorker from './serviceWorker';
import { StoreProvider as CustomSetStoreProvider } from './custom-set/store';
import { StoreProvider as DeckBuilderStoreProvider } from './deck-builder/store';
import DeckBuilderApp from './deck-builder/DeckBuilderApp';
import Editor from './deck-builder/components/Editor';

LogRocket.init('fkb4jh/magic-collection-renderer');
setupLogRocketReact(LogRocket);

const CustomSet = () => (
  <CustomSetStoreProvider>
    <BrowserView>
      <App />
    </BrowserView>
    <MobileView>
      <MobileApp />
    </MobileView>
  </CustomSetStoreProvider>
);

const DeckBuilder = () => (
  <DeckBuilderStoreProvider>
    <DeckBuilderApp />
  </DeckBuilderStoreProvider>
);

ReactDOM.render(
  <Router>
    <Switch>
      <Route path="/deck-builder" component={DeckBuilder} />
      <Route component={CustomSet} />
    </Switch>
  </Router>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
