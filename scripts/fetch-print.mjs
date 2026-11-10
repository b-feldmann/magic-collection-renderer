// Downloads the Scryfall image of a printed card to prints/<name>_<artstyle>.<ext>.
//
//   npm run fetch:print -- "Card Name" [--artstyle extended|borderless]
//
// Searches https://api.scryfall.com/cards/search?unique=prints&q=<name> and
// picks the first print whose frame_effects match the art style:
//   (none)      neither "extendedart" nor "inverted"  -> prints/<name>_.webp
//   extended    contains "extendedart"                -> prints/<name>_extended.webp
//   borderless  contains "inverted"                   -> prints/<name>_borderless.webp
// The image is taken from image_uris.display (front face for double-faced cards).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'prints');
const API = 'https://api.scryfall.com';
// Scryfall requires a User-Agent and an Accept header on every API request.
const HEADERS = { 'User-Agent': 'magic-collection-renderer/1.0', Accept: 'application/json' };

const ART_STYLES = {
  extended: effects => effects.includes('extendedart'),
  borderless: effects => effects.includes('inverted'),
};
const isDefaultStyle = effects => !effects.includes('extendedart') && !effects.includes('inverted');

const usage = 'Usage: npm run fetch:print -- "<card name>" [--artstyle extended|borderless]';

class ScriptError extends Error {}

// Throws instead of calling process.exit(): exiting while fetch() still holds
// sockets crashes Node on Windows (libuv UV_HANDLE_CLOSING assertion).
function fail(message) {
  throw new ScriptError(message);
}

async function main() {
  const { values: options, positionals } = parseArgs({
    allowPositionals: true,
    options: { artstyle: { type: 'string' } },
  });

  const name = positionals.join(' ').trim();
  if (!name) fail(usage);
  const artStyle = options.artstyle?.toLowerCase() ?? '';
  if (artStyle && !ART_STYLES[artStyle]) fail(`Unknown artstyle "${options.artstyle}".\n${usage}`);
  const matchesStyle = artStyle ? ART_STYLES[artStyle] : isDefaultStyle;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function getJson(url) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, { headers: HEADERS });
      if (response.status === 429 && attempt < 3) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      const body = await response.json().catch(() => null);
      if (response.status === 404 && body?.object === 'error') return { data: [], has_more: false };
      if (!response.ok)
        fail(`Scryfall request failed (${response.status}): ${body?.details ?? url}`);
      return body;
    }
  }

  async function searchPrints(query) {
    const prints = [];
    let url = `${API}/cards/search?unique=prints&q=${encodeURIComponent(query)}`;
    while (url) {
      const page = await getJson(url);
      prints.push(...page.data);
      url = page.has_more ? page.next_page : null;
      // Scryfall asks for 50–100 ms between requests.
      if (url) await sleep(100);
    }
    return prints;
  }

  const displayUrl = card => card.image_uris?.display ?? card.card_faces?.[0]?.image_uris?.display;

  const allPrints = await searchPrints(name);
  // The query is a name search, so it can also hit other cards whose names contain it.
  const exact = allPrints.filter(card => card.name.toLowerCase() === name.toLowerCase());
  const candidates = exact.length > 0 ? exact : allPrints;
  if (candidates.length === 0) fail(`No card found on Scryfall for "${name}".`);

  const card = candidates.find(c => matchesStyle(c.frame_effects ?? []) && displayUrl(c));
  if (!card) {
    const found = candidates
      .map(c => `  ${c.set} ${c.collector_number}: [${(c.frame_effects ?? []).join(', ')}]`)
      .join('\n');
    fail(`No ${artStyle || 'regular'} print of "${candidates[0].name}" found. Prints:\n${found}`);
  }

  const imageUrl = displayUrl(card);
  const response = await fetch(imageUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
  if (!response.ok) fail(`Image download failed (${response.status}): ${imageUrl}`);

  const extension = path.extname(new URL(imageUrl).pathname) || '.jpg';
  // Strip characters Windows does not allow in file names.
  const fileName = `${card.name.replace(/[<>:"/\\|?*]/g, '')}_${artStyle}${extension}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(outPath, Buffer.from(await response.arrayBuffer()));

  console.log(
    `${card.name} (${card.set.toUpperCase()} ${card.collector_number}) -> ${path.relative(ROOT, outPath)}`,
  );
}

main().catch(error => {
  console.error(error instanceof ScriptError ? error.message : error);
  process.exitCode = 1;
});
