// Renders one card of the collection to renders/<card-name>.png.
//
//   npm run render:card -- "Card Name" [--key <access key>] [--middleware <url>] [--width <px>]
//
// The card is looked up by name through the middleware (GET /cards), its cover
// images are fetched from GET /images and the mechanics from GET /mechanics.
// The card is then drawn with TemplatingCardRender on a page served by Vite
// and captured by an offscreen Electron window. Double-faced cards also get a
// <card-name>-back.png. Needs the middleware running (see AGENTS.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import electronPath from 'electron';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'renders');
const CARD_WIDTH = 1500;
const CARD_HEIGHT = 2100;

const usage =
  'Usage: npm run render:card -- "<card name>" [--key <access key>] [--middleware <url>] [--width <px>]';

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    key: { type: 'string', default: process.env.MAGIC_ACCESS_KEY || 'dev-access-key' },
    middleware: {
      type: 'string',
      default: process.env.MAGIC_MIDDLEWARE_URL || 'http://localhost:8080',
    },
    width: { type: 'string', default: String(CARD_WIDTH) },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

// Thrown for expected failures and printed without a stack trace. (Calling
// process.exit() while fetch sockets close trips a libuv assertion on Windows.)
class RenderError extends Error {}
const fail = message => {
  throw new RenderError(message);
};

const cardName = positionals.join(' ').trim();
const width = Number(options.width);
const height = Math.round((width / CARD_WIDTH) * CARD_HEIGHT);

const api = async (route, params = {}) => {
  const url = new URL(route, options.middleware);
  url.searchParams.set('accessKey', options.key);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(`Couldn't reach the middleware at ${options.middleware} (${error.cause?.code ?? error}).`);
  }
  if (response.status === 401) fail('The middleware rejected the access key (use --key).');
  if (!response.ok) fail(`GET ${route} failed: ${response.status} ${response.statusText}`);
  return response.json();
};

const normalize = name => (name || '').trim().toLowerCase();
const cardNames = card => [card.name, card.front?.name, card.back?.name].map(normalize);

const findCards = cards => {
  const wanted = normalize(cardName);
  const exact = cards.filter(card => cardNames(card).includes(wanted));
  if (exact.length > 0) return exact;

  const partial = cards.filter(card => cardNames(card).some(name => name.includes(wanted)));
  if (partial.length === 1) return partial;
  if (partial.length > 1) {
    fail(
      `"${cardName}" matches several cards, be more specific:\n` +
        partial.map(card => `  - ${card.name}`).join('\n'),
    );
  }
  fail(`No card named "${cardName}" in the collection.`);
};

const slugify = name =>
  normalize(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card';

// Uploaded covers are stored in the images collection; the card itself only
// carries a `loading[:<name>]` placeholder (see src/utils/cover.ts).
const isLoadingCover = cover => cover === 'loading' || cover?.startsWith('loading:');
const resolveCover = async (card, face) => {
  const cover = face === 1 ? card.back?.cover : card.front.cover;
  if (!isLoadingCover(cover)) return cover;
  const image = await api('/images', { cardUuid: card.uuid, face });
  return image?.base64 ? `base64:${image.base64}` : '';
};

const buildFaces = async (cards, matches, mechanics) => {
  // Collector number: position in the collection sorted by name, so it stays
  // stable between runs (the app's number depends on the chosen sort).
  const byName = [...cards].sort((a, b) =>
    normalize(a.front.name).localeCompare(normalize(b.front.name)),
  );

  const faces = [];
  for (const card of matches) {
    const baseName =
      matches.length > 1 ? `${slugify(card.name)}-${card.uuid.slice(0, 8)}` : slugify(card.name);
    const sides = card.back ? [0, 1] : [0];
    for (const side of sides) {
      const face = side === 1 ? { ...card.back, backFace: true } : card.front;
      faces.push({
        outPath: path.join(OUT_DIR, side === 1 ? `${baseName}-back.png` : `${baseName}.png`),
        render: {
          mechanics,
          props: {
            ...face,
            cover: await resolveCover(card, side),
            containerWidth: width,
            cardID: card.uuid,
            creator: card.creator?.name,
            rarity: card.rarity,
            manaCost: card.manaCost,
            collectionNumber: byName.findIndex(other => other.uuid === card.uuid) + 1,
            collectionSize: cards.length,
          },
        },
      });
    }
  }
  return faces;
};

const runElectron = jobPath =>
  new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    // The page is a local dev build; Electron's CSP warning is only noise here.
    env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
    const child = spawn(
      electronPath,
      [path.join(ROOT, 'scripts/render-card/electron-main.cjs'), `--job=${jobPath}`],
      { stdio: 'inherit', env },
    );
    child.on('error', reject);
    child.on('exit', code =>
      code === 0 ? resolve() : reject(new Error(`Electron exited with code ${code}.`)),
    );
  });

const main = async () => {
  if (options.help) {
    console.log(usage);
    return;
  }
  if (!cardName) fail(usage);
  if (!Number.isFinite(width) || width <= 0) fail(`Invalid --width "${options.width}".`);

  const [{ cards }, { mechanics = [] }] = await Promise.all([api('/cards'), api('/mechanics')]);
  const matches = findCards(cards);
  console.log(`Rendering ${matches.map(card => card.name).join(', ')} at ${width}x${height}px`);
  const faces = await buildFaces(cards, matches, mechanics);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-card-'));
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.mts'),
    logLevel: 'error',
    clearScreen: false,
    server: { port: 0, strictPort: false, hmr: false },
  });
  try {
    await server.listen();
    const { port } = server.httpServer.address();
    const jobPath = path.join(tmpDir, 'job.json');
    fs.writeFileSync(
      jobPath,
      JSON.stringify({
        url: `http://localhost:${port}/scripts/render-card/render.html`,
        width,
        height,
        faces,
      }),
    );
    await runElectron(jobPath);
  } finally {
    await server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

main().catch(error => {
  console.error(error instanceof RenderError ? error.message : (error?.stack ?? String(error)));
  process.exitCode = 1;
});
