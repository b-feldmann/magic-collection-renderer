import React from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

import { BrowserView, MobileView } from 'react-device-detect';

import 'mana-font/css/mana.css';
import './index.css';
import App from './App';
import MobileApp from './MobileApp';
import { StoreProvider as CustomSetStoreProvider } from './store';
import { StaticAntdBridge } from './utils/staticAntd';
import { applyApiKeyFromUrl } from './utils/applyApiKeyFromUrl';

LogRocket.init('fkb4jh/magic-collection-renderer');
setupLogRocketReact(LogRocket);

applyApiKeyFromUrl();

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#391085' } }}>
      <AntdApp component={false}>
        <StaticAntdBridge />
        <CustomSetStoreProvider>
          <BrowserView>
            <App />
          </BrowserView>
          <MobileView>
            <MobileApp />
          </MobileView>
        </CustomSetStoreProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
