/**
 * generate-parts.cjs
 *
 * Generates per-color pinline images by using
 * `mainframes/pinline/pinline.png` as a mask and carving the pinline shape
 * out of each m15 color frame.
 *
 * For every color frame in `mainframes/m15/<color>.png` we keep only the
 * pixels that fall on a visible (non-transparent) pixel of the mask and make
 * everything else transparent. The result is written to
 * `mainframes/pinline/<color>.png`.
 *
 * Run with: npm run generate:pinline
 */

const path = require('path');
const fs = require('fs');
const { Jimp } = require('jimp');

const COLORS = ['a', 'b', 'c', 'g', 'm', 'r', 'u', 'v', 'w'];
const PART_TYPES = ['pinline', 'rules', 'title', 'type'];

const MAINFRAMES_DIR = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'TemplatingCardRender',
  'images',
  'mainframes',
);
const PARTS_DIR = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'TemplatingCardRender',
  'images',
  'parts',
);

const SOURCE_DIR = path.join(MAINFRAMES_DIR, 'm15');

// A mask pixel counts as "on" when its alpha is above this threshold.
// 0 means any non-transparent pixel is kept (hard binary cutoff).
const MASK_ALPHA_THRESHOLD = 0;

async function generate(type, maskPath, outputDir) {
  if (!fs.existsSync(maskPath)) {
    throw new Error(`Mask image not found: ${maskPath}`);
  }

  const mask = await Jimp.read(maskPath);
  const { width: maskW, height: maskH } = mask.bitmap;
  const maskData = mask.bitmap.data;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let written = 0;
  const skipped = [];

  for (const color of COLORS) {
    const sourcePath = path.join(SOURCE_DIR, `${color}.png`);

    if (!fs.existsSync(sourcePath)) {
      skipped.push(`${color} (source missing: ${sourcePath})`);
      continue;
    }

    const frame = await Jimp.read(sourcePath);
    const { width, height } = frame.bitmap;

    if (width !== maskW || height !== maskH) {
      skipped.push(`${color} (size ${width}x${height} != mask ${maskW}x${maskH})`);
      continue;
    }

    const frameData = frame.bitmap.data;
    const out = new Jimp({ width, height, color: 0x00000000 });
    const outData = out.bitmap.data;

    for (let i = 0; i < frameData.length; i += 4) {
      const maskAlpha = maskData[i + 3];
      if (maskAlpha > MASK_ALPHA_THRESHOLD) {
        outData[i] = frameData[i]; // R
        outData[i + 1] = frameData[i + 1]; // G
        outData[i + 2] = frameData[i + 2]; // B
        outData[i + 3] = frameData[i + 3]; // A
      }
      // else: leave fully transparent (already 0 from blank image)
    }

    const outPath = path.join(outputDir, `${color}.png`);
    await out.write(outPath);
    written += 1;
    console.log(`${type}  ✓ ${color}.png`);
  }

  console.log(`\nDone. Wrote ${written} ${type} image(s) to ${outputDir}`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
}

PART_TYPES.forEach(type => {
  const maskPath = path.join(PARTS_DIR, `${type}.png`);
  const outputDir = path.join(PARTS_DIR, type);
  generate(type, maskPath, outputDir).catch(err => {
    console.error(`Failed to generate ${type}:`, err);
    process.exit(1);
  });
});
