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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#141414',
          fontFamily:
            "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          borderRadius: 12,
          borderRadiusLG: 12,
          colorBgLayout: '#f0f2f5',
          colorText: '#141414',
          colorTextSecondary: '#8c8c8c',
          colorBorderSecondary: '#f0f0f0',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.06)',
          boxShadowSecondary: '0 12px 24px rgba(0, 0, 0, 0.08)',
        },
        components: {
          Card: {
            borderRadiusLG: 12,
            boxShadowTertiary: '0 20px 27px rgba(0, 0, 0, 0.05)',
          },
          Button: {
            borderRadius: 8,
          },
        },
      }}
    >
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
