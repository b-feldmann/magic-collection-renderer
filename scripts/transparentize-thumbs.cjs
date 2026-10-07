/**
 * transparentize-thumbs.cjs
 *
 * Replaces pure white pixels with fully transparent ones in every
 * `*Thumb.png` file under `src/components/TemplatingCardRender/images/mainframes`
 * (searched recursively).
 *
 * The thumbnails are full card silhouettes whose art/text boxes are filled
 * with pure white (255,255,255). Making those boxes transparent lets the
 * underlying card art show through when the thumb is rendered on top of it.
 *
 * Only exact white (with a small tolerance, adjustable via THRESHOLD below)
 * is touched; frame-texture highlight colors stay intact because they max
 * out around RGB 248.
 *
 * Run with: npm run transparentize:thumbs
 */

const path = require('path');
const fs = require('fs');
const { Jimp } = require('jimp');

const MAINFRAMES_DIR = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'TemplatingCardRender',
  'images',
  'mainframes',
);

// A pixel counts as "white" when each of its RGB channels is >= this value.
const THRESHOLD = 255;

function listThumbs(dir) {
  const acc = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) acc.push(...listThumbs(full));
    else if (entry.name.endsWith('Thumb.png')) acc.push(full);
  }
  return acc;
}

(async () => {
  const files = listThumbs(MAINFRAMES_DIR);
  if (files.length === 0) {
    console.log('No *Thumb.png files found under', MAINFRAMES_DIR);
    return;
  }

  let totalCleared = 0;
  for (const file of files) {
    const image = await Jimp.read(file);
    const { data } = image.bitmap;

    let cleared = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i] >= THRESHOLD &&
        data[i + 1] >= THRESHOLD &&
        data[i + 2] >= THRESHOLD &&
        data[i + 3] !== 0
      ) {
        data[i + 3] = 0;
        cleared++;
      }
    }

    if (cleared > 0) {
      await image.write(file);
      totalCleared += cleared;
      console.log(
        `${path.relative(process.cwd(), file)}: ${cleared} white pixels -> transparent`,
      );
    } else {
      console.log(`${path.relative(process.cwd(), file)}: nothing to do`);
    }
  }

  console.log(
    `Done. ${files.length} file(s) processed, ${totalCleared} pixels made transparent.`,
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
