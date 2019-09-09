import React from 'react';
import ReactDOM from 'react-dom';

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

import { BrowserView, MobileView } from 'react-device-detect';

import './index.css';
import App from './App';
import MobileApp from './MobileApp';
import * as serviceWorker from './serviceWorker';
import { StoreProvider } from './store';

LogRocket.init('fkb4jh/magic-collection-renderer');
setupLogRocketReact(LogRocket);

ReactDOM.render(
  <StoreProvider>
    <BrowserView>
      <App />
    </BrowserView>
    <MobileView>
      <MobileApp />
    </MobileView>
  </StoreProvider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
