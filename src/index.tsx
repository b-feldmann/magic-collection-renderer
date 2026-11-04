import React from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';

import { BrowserView, isMobile, MobileView } from 'react-device-detect';

import 'mana-font/css/mana.css';
import './index.css';
import App from './App';
import MobileApp from './MobileApp';
import { StoreProvider as CustomSetStoreProvider } from './store';
import { StaticAntdBridge } from './utils/staticAntd';
import { applyApiKeyFromUrl } from './utils/applyApiKeyFromUrl';

applyApiKeyFromUrl();

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#14532d',
          fontFamily:
            "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          borderRadius: 8,
          borderRadiusSM: 8,
          borderRadiusLG: 12,
          // Keep in step with --control-height in index.css.
          controlHeight: isMobile ? 44 : 34,
          ...(isMobile ? { controlHeightSM: 44 } : {}),
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
          Tabs: {
            // No ink bar: the active tab's fill carries the state.
            inkBarColor: 'transparent',
            itemColor: '#1e241f',
            itemHoverColor: '#1e241f',
            itemSelectedColor: '#ffffff',
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
