import React from 'react';
import { App } from 'antd';

type AppApi = ReturnType<typeof App.useApp>;

/**
 * Module-level holder for antd's context-aware feedback APIs
 * (`message` / `notification` / `modal`).
 *
 * The `actions/*` thunk layer is not made of React components, so it cannot call
 * `App.useApp()` directly. antd's static `message.*` / `Modal.*` helpers render
 * outside the React tree and therefore cannot read the dynamic theme provided by
 * `ConfigProvider`, which triggers:
 *   "[antd: message] Static function can not consume context like dynamic theme."
 *
 * `StaticAntdBridge` (mounted inside antd's <App>) writes the context-aware
 * instances here so non-React code can use them without the warning.
 */
export const staticAntd = {} as AppApi;

/**
 * Bridges antd's context-aware feedback APIs to the `staticAntd` holder.
 * Must be rendered inside antd's <App> component.
 */
export const StaticAntdBridge: React.FC = () => {
  const app = App.useApp();
  // Idempotent assignment; keeps the holder pointed at the current instances.
  staticAntd.message = app.message;
  staticAntd.notification = app.notification;
  staticAntd.modal = app.modal;
  return null;
};
