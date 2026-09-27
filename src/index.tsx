import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

import { BrowserView, MobileView } from 'react-device-detect';

import 'mana-font/css/mana.css';
import './index.css';
import App from './App';
import MobileApp from './MobileApp';
import { StoreProvider as CustomSetStoreProvider } from './store';

LogRocket.init('fkb4jh/magic-collection-renderer');
setupLogRocketReact(LogRocket);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <ConfigProvider theme={{ token: { colorPrimary: '#391085' } }}>
    <CustomSetStoreProvider>
      <BrowserView>
        <App />
      </BrowserView>
      <MobileView>
        <MobileApp />
      </MobileView>
    </CustomSetStoreProvider>
  </ConfigProvider>,
);
