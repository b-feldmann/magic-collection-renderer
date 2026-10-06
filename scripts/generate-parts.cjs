/**
 * generate-parts.cjs
 *
 * Generates per-color frame-part images by using each part mask in
 * `parts/<type>.png` (pinline, rules, title, type) to carve that part's shape
 * out of every m15 color frame.
 *
 * For every color frame in `mainframes/m15/<color>.png` we keep only the
 * pixels that fall on a visible (non-transparent) pixel of the mask and make
 * everything else transparent. The result is written to
 * `parts/<type>/<color>.png`.
 *
 * Two-color combinations (e.g. `gu`) are also generated: the first color fills
 * the left side, the second color the right side, with a narrow gradient blend
 * across the centre. These are written to `parts/<type>/<combo>.png`.
 *
 * Run with: npm run generate:parts
 */

const path = require('path');
const fs = require('fs');
const { Jimp } = require('jimp');

const COLORS = ['l', 'a', 'b', 'c', 'g', 'm', 'r', 'u', 'v', 'w'];
const PART_TYPES = ['pinline', 'rules', 'title', 'type'];

// Two-color combinations in WUBRG wheel order. The first letter is rendered on
// the left side, the second letter on the right side.
const COMBINATIONS = ['wu', 'ub', 'br', 'rg', 'gw', 'wb', 'ur', 'bg', 'rw', 'gu'];

const IMAGE_DIR = path.join(
  __dirname,
  '..',
  'src',
  'components',
  'TemplatingCardRender',
  'images',
);
const MAINFRAMES_DIR = path.join(IMAGE_DIR, 'mainframes');
const PARTS_DIR = path.join(IMAGE_DIR, 'parts');

const SOURCE_DIR = path.join(MAINFRAMES_DIR, 'm15');
const SOURCE_LAND_DIR = path.join(MAINFRAMES_DIR, 'lands');

// A mask pixel counts as "on" when its alpha is above this threshold.
// 0 means any non-transparent pixel is kept (hard binary cutoff).
const MASK_ALPHA_THRESHOLD = 0;

// Fraction of the image width over which the two colors of a combination blend,
// centered horizontally. 0.15 => solid outer ~42.5% on each side, gradient
// across the middle 15%.
const BLEND_RATIO = 0.07;

/**
 * Carve a single color frame down to the mask shape: keep the frame pixel
 * wherever the mask is visible, transparent elsewhere.
 */
function carveSingle(frame, mask) {
  const { width, height } = frame.bitmap;
  const frameData = frame.bitmap.data;
  const maskData = mask.bitmap.data;

  const out = new Jimp({ width, height, color: 0x00000000 });
  const outData = out.bitmap.data;

  for (let i = 0; i < frameData.length; i += 4) {
    if (maskData[i + 3] > MASK_ALPHA_THRESHOLD) {
      outData[i] = frameData[i]; // R
      outData[i + 1] = frameData[i + 1]; // G
      outData[i + 2] = frameData[i + 2]; // B
      outData[i + 3] = frameData[i + 3]; // A
    }
    // else: leave fully transparent (already 0 from blank image)
  }

  return out;
}

/**
 * Carve a two-color combination down to the mask shape. frame1 fills the left,
 * frame2 the right, with a linear blend across the centre BLEND_RATIO band.
 */
function carveCombo(frame1, frame2, mask) {
  const { width, height } = mask.bitmap;
  const d1 = frame1.bitmap.data;
  const d2 = frame2.bitmap.data;
  const maskData = mask.bitmap.data;

  const out = new Jimp({ width, height, color: 0x00000000 });
  const outData = out.bitmap.data;

  const blendStart = width * (0.5 - BLEND_RATIO / 2);
  const blendEnd = width * (0.5 + BLEND_RATIO / 2);
  const blendSpan = blendEnd - blendStart;

  for (let i = 0; i < d1.length; i += 4) {
    if (maskData[i + 3] > MASK_ALPHA_THRESHOLD) {
      const x = (i / 4) % width;
      let t;
      if (x <= blendStart) t = 0;
      else if (x >= blendEnd) t = 1;
      else t = (x - blendStart) / blendSpan;

      outData[i] = Math.round(d1[i] * (1 - t) + d2[i] * t); // R
      outData[i + 1] = Math.round(d1[i + 1] * (1 - t) + d2[i + 1] * t); // G
      outData[i + 2] = Math.round(d1[i + 2] * (1 - t) + d2[i + 2] * t); // B
      outData[i + 3] = Math.round(d1[i + 3] * (1 - t) + d2[i + 3] * t); // A
    }
    // else: leave fully transparent (already 0 from blank image)
  }

  return out;
}

/** Load every available m15 color frame once, keyed by color letter. */
async function loadFrames() {
  const frames = new Map();
  for (const color of COLORS) {
    const sourcePath = path.join(SOURCE_DIR, `${color}.png`);
    if (fs.existsSync(sourcePath)) {
      frames.set(color, await Jimp.read(sourcePath));
    }
  }
  const sourcePath = path.join(SOURCE_LAND_DIR, `l.png`);
  if (fs.existsSync(sourcePath)) {
    frames.set('l', await Jimp.read(sourcePath));
  }
  return frames;
}

function sameSize(frame, maskW, maskH) {
  return frame.bitmap.width === maskW && frame.bitmap.height === maskH;
}

async function generate(type, maskPath, frames, outputDir) {
  if (!fs.existsSync(maskPath)) {
    throw new Error(`Mask image not found: ${maskPath}`);
  }

  const mask = await Jimp.read(maskPath);
  const { width: maskW, height: maskH } = mask.bitmap;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let written = 0;
  const skipped = [];

  // Single colors.
  for (const color of COLORS) {
    const frame = frames.get(color);

    if (!frame) {
      skipped.push(`${color} (source missing)`);
      continue;
    }
    if (!sameSize(frame, maskW, maskH)) {
      const { width, height } = frame.bitmap;
      skipped.push(`${color} (size ${width}x${height} != mask ${maskW}x${maskH})`);
      continue;
    }

    const out = carveSingle(frame, mask);
    await out.write(path.join(outputDir, `${color}.png`));
    written += 1;
    console.log(`${type}  ✓ ${color}.png`);
  }

  // Two-color combinations.
  for (const combo of COMBINATIONS) {
    const [c1, c2] = combo.split('');
    const frame1 = frames.get(c1);
    const frame2 = frames.get(c2);

    if (!frame1 || !frame2) {
      const missing = [!frame1 && c1, !frame2 && c2].filter(Boolean).join(', ');
      skipped.push(`${combo} (source missing: ${missing})`);
      continue;
    }
    if (!sameSize(frame1, maskW, maskH) || !sameSize(frame2, maskW, maskH)) {
      skipped.push(`${combo} (source size != mask ${maskW}x${maskH})`);
      continue;
    }

    const out = carveCombo(frame1, frame2, mask);
    await out.write(path.join(outputDir, `${combo}.png`));
    written += 1;
    console.log(`${type}  ✓ ${combo}.png`);
  }

  console.log(`\nDone. Wrote ${written} ${type} image(s) to ${outputDir}`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
}

async function run() {
  const frames = await loadFrames();
  for (const type of PART_TYPES) {
    const maskPath = path.join(PARTS_DIR, `${type}.png`);
    const outputDir = path.join(PARTS_DIR, type);
    await generate(type, maskPath, frames, outputDir);
  }
}

run().catch(err => {
  console.error('Failed to generate parts:', err);
  process.exit(1);
});
