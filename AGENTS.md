# AGENTS.md

Magic card collection renderer/editor. **Vite** + **React 19** + **antd 6**, TypeScript. Also
packaged as an Electron desktop app.

## Commands (use npm — `package-lock.json` is the lockfile)

- `npm start` — Vite dev server on http://localhost:3000
- `npm run dev` — foreman (`nf start`, see `Procfile`) runs the Vite dev server + Electron together
- `npm run build` — type-check (`tsc`) then production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm test` — Vitest (jsdom). Single test: `npm test <pattern>`
- `npm run lint` — `eslint "src/**/*.{ts,tsx}"` (flat config in `eslint.config.js`)
- `npm run deploy` — builds then publishes `dist/` via gh-pages

Build config lives in `vite.config.mts` and `tsconfig.json`. Peer-dependency conflicts from older
React-ecosystem libs are tolerated via `.npmrc` (`legacy-peer-deps=true`).

## Backend requirement (easy to miss)

The app is a pure frontend and needs a separate middleware server (MongoDB-backed):
https://github.com/BJennWare/magic-collection-middleware. In dev, all API calls in `src/actions/*`
hit `http://localhost:8080`; in production (`import.meta.env.PROD`) they use relative paths (`''`,
`/images`, `/user`, ...). Without the server running the UI loads but has no data.

## Architecture

- **State**: vanilla React only — `useContext` + `useReducer`. Global store is `src/store.tsx`
  (`Store` context + `StoreProvider`), reducer is `src/reducer.ts` (all action-type enums live here).
  Do **not** introduce redux/mobx/etc.
- **API layer**: `src/actions/*Actions.ts` — thunk-style functions that take `dispatch` and call the
  middleware with axios. Errors go through `src/actions/errorLog.ts` (LogRocket).
- **Types**: `src/interfaces/*` (`CardInterface`, `MechanicInterface`, ...) and `interfaces/enums.ts`.
- **Entry**: `src/index.tsx`. Desktop UI in `src/App.tsx`, mobile UI in `src/MobileApp.tsx`
  (switched via `react-device-detect`).
- **Rendering**: card art/templating lives in `src/components/TemplatingCardRender` and
  `BigCardRenderModal`; virtualized collection grid uses `react-window` v2 (`Grid` with
  `cellComponent`/`cellProps`). PDF export via `PdfDownloadWrapper` (kendo/jspdf).
- **Shims for removed libraries**: `src/components/AntIcon` (old antd 3 string-`Icon` API →
  `@ant-design/icons`), `src/components/Comment` (antd removed `Comment` in v5),
  `src/components/Mana` (mana-font CSS instead of `@saeris/react-mana`),
  `src/components/TextResize` (instead of `react-resize-text`).
- **Electron**: `main` is `src/electron-starter.js`; Vite `base: './'` keeps asset paths relative.

## Conventions

- Functional components + hooks only (no class components).
- Styling: SCSS modules (dart-sass) plus antd. antd theme is customized via `<ConfigProvider
  theme={{ token: { colorPrimary: '#391085' } }}>` in `src/index.tsx` — import antd components
  normally (`import { Button } from 'antd'`); tree-shaking is native.
- ESLint flat config = typescript-eslint + prettier; **Prettier runs as an ESLint rule** with
  `singleQuote: true, printWidth: 100`. Match that formatting.
- TypeScript is `strict: true`, target `ES2020`. The React 19-era JSX namespace lives under
  `React.JSX` (a global shim is in `src/global.d.ts` because the code references `JSX.Element`).
