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
 * Additionally, pinline variants for the `extended` and `borderless` art
 * styles are generated from those styles' own single-color frames (in
 * `mainframes/extended` and `mainframes/borderless`) using the
 * `parts/extendedPinline.png` mask. Only the two-color combinations are
 * produced for these variants, written to `parts/pinline/<variant>/<combo>.png`.
 *
 * Nickname title plates (`images/nickname/m15NicknameTitle<X>.png`) also get
 * their two-color combinations, blended from the single-color plates into
 * `m15NicknameTitle<combo>.png`.
 *
 * Token frames have their own pinline, type and rules shapes, so the token
 * parts are carved from the token frames (`mainframes/token/tokenFrame<X>Short.png`)
 * using the dedicated `parts/tokenPinline.png`, `parts/tokenType.png` and
 * `parts/tokenRules.png` masks. The single-color token frames are rendered
 * whole elsewhere, so only the two-color combinations are produced, written to
 * `parts/tokenPinline/<combo>.png`, `parts/tokenType/<combo>.png` and
 * `parts/tokenRules/<combo>.png`.
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
// Nickname title plates live outside mainframes and already carry their own
// transparent silhouette, so no extra mask is needed to blend combinations.
const NICKNAME_DIR = path.join(IMAGE_DIR, 'nickname');
// Crown images already carry their own transparent silhouette (same as the
// nickname plates), so combinations are self-masked and need no mask file.
const CROWN_DIR = path.join(IMAGE_DIR, 'crown');

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

/**
 * Carve the two-color combinations from the given frames and mask, writing one
 * `<combo>.png` per combination to `outputDir`. Returns the number of written
 * files and a list of skip reasons.
 */
async function writeCombos(label, frames, mask, maskW, maskH, outputDir) {
  let written = 0;
  const skipped = [];

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
    console.log(`${label}  ✓ ${combo}.png`);
  }

  return { written, skipped };
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
  const comboResult = await writeCombos(type, frames, mask, maskW, maskH, outputDir);
  written += comboResult.written;
  skipped.push(...comboResult.skipped);

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
  await generateVariantPinlines();
  await generateTokenParts();
  await generateNicknameCombos();
  await generateCrownCombos();
}

// Token pinline, type and rules parts: the token frames differ from the m15
// frames in these regions, so the color pairs are carved from the token frames
// (`mainframes/token/tokenFrame<X>Short.png`) using the token-specific masks.
// Single-color token frames are rendered whole elsewhere, so only the two-color
// combinations are generated here, written to `parts/<tokenType>/<combo>.png`.
const TOKEN_PART_TYPES = [
  { type: 'tokenPinline', mask: 'tokenPinline.png' },
  { type: 'tokenType', mask: 'tokenType.png' },
  { type: 'tokenRules', mask: 'tokenRules.png' },
];

async function generateTokenParts() {
  for (const { type, mask: maskName } of TOKEN_PART_TYPES) {
    const maskPath = path.join(PARTS_DIR, maskName);
    if (!fs.existsSync(maskPath)) {
      throw new Error(`Mask image not found: ${maskPath}`);
    }
    const mask = await Jimp.read(maskPath);
    const { width: maskW, height: maskH } = mask.bitmap;

    const frames = new Map();
    for (const color of VARIANT_COLORS) {
      const sourcePath = path.join(
        MAINFRAMES_DIR,
        'token',
        `tokenFrame${color.toUpperCase()}Short.png`,
      );
      if (fs.existsSync(sourcePath)) {
        const frame = await Jimp.read(sourcePath);
        if (!sameSize(frame, maskW, maskH)) {
          frame.resize({ w: maskW, h: maskH });
        }
        frames.set(color, frame);
      }
    }

    const outputDir = path.join(PARTS_DIR, type);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const { written, skipped } = await writeCombos(
      type,
      frames,
      mask,
      maskW,
      maskH,
      outputDir,
    );

    console.log(`\nDone. Wrote ${written} ${type} image(s) to ${outputDir}`);
    if (skipped.length > 0) {
      console.log(`Skipped ${skipped.length}:`);
      for (const s of skipped) console.log(`  - ${s}`);
    }
  }
}

// Pinline variants for the extended and borderless art styles: the single
// colors come from the art style's own frames, and only the two-color
// combinations are generated (using the extendedPinline mask for both).
const VARIANT_COLORS = ['w', 'u', 'b', 'r', 'g'];
const PINLINE_VARIANTS = [
  {
    name: 'extended',
    sourceFor: color => path.join(MAINFRAMES_DIR, 'extended', `${color}.png`),
  },
  {
    name: 'borderless',
    sourceFor: color =>
      path.join(MAINFRAMES_DIR, 'borderless', `m15GenericShowcaseFrame${color.toUpperCase()}.png`),
  },
];

async function generateVariantPinlines() {
  const maskPath = path.join(PARTS_DIR, 'extendedPinline.png');
  if (!fs.existsSync(maskPath)) {
    throw new Error(`Mask image not found: ${maskPath}`);
  }
  const mask = await Jimp.read(maskPath);
  const { width: maskW, height: maskH } = mask.bitmap;

  for (const variant of PINLINE_VARIANTS) {
    const frames = new Map();
    for (const color of VARIANT_COLORS) {
      const sourcePath = variant.sourceFor(color);
      if (fs.existsSync(sourcePath)) {
        const frame = await Jimp.read(sourcePath);
        // The borderless showcase frames are smaller than the mask (same
        // aspect ratio), so scale them up to the mask size before carving.
        if (!sameSize(frame, maskW, maskH)) {
          frame.resize({ w: maskW, h: maskH });
        }
        frames.set(color, frame);
      }
    }

    const outputDir = path.join(PARTS_DIR, 'pinline', variant.name);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const { written, skipped } = await writeCombos(
      `pinline/${variant.name}`,
      frames,
      mask,
      maskW,
      maskH,
      outputDir,
    );

    console.log(`\nDone. Wrote ${written} pinline/${variant.name} image(s) to ${outputDir}`);
    if (skipped.length > 0) {
      console.log(`Skipped ${skipped.length}:`);
      for (const s of skipped) console.log(`  - ${s}`);
    }
  }
}

// Nickname title plates for two-color combinations: blend the existing
// single-color plates (e.g. m15NicknameTitleW.png + m15NicknameTitleU.png)
// left/right with a centre gradient. The plates already carry their own
// transparent silhouette, and all share the same shape, so the first plate
// doubles as the mask when carving. Written to
// `<NICKNAME_DIR>/m15NicknameTitle<combo>.png`.
async function generateNicknameCombos() {
  const comboLetterMap = { w: 'W', u: 'U', b: 'B', r: 'R', g: 'G' };

  const plates = new Map();
  for (const [letter, upper] of Object.entries(comboLetterMap)) {
    const sourcePath = path.join(NICKNAME_DIR, `m15NicknameTitle${upper}.png`);
    if (fs.existsSync(sourcePath)) {
      plates.set(letter, await Jimp.read(sourcePath));
    }
  }

  const sample = await Jimp.read(path.join(NICKNAME_DIR, 'm15NicknameTitleW.png'));
  const { width, height } = sample.bitmap;

  let written = 0;
  const skipped = [];

  for (const combo of COMBINATIONS) {
    const [c1, c2] = combo.split('');
    const plate1 = plates.get(c1);
    const plate2 = plates.get(c2);

    if (!plate1 || !plate2) {
      const missing = [!plate1 && c1, !plate2 && c2].filter(Boolean).join(', ');
      skipped.push(`${combo} (source missing: ${missing})`);
      continue;
    }
    if (!sameSize(plate1, width, height) || !sameSize(plate2, width, height)) {
      skipped.push(`${combo} (source size != ${width}x${height})`);
      continue;
    }

    const out = carveCombo(plate1, plate2, sample);
    await out.write(path.join(NICKNAME_DIR, `m15NicknameTitle${combo.toUpperCase()}.png`));
    written += 1;
    console.log(`nickname  ✓ m15NicknameTitle${combo.toUpperCase()}.png`);
  }

  console.log(`\nDone. Wrote ${written} nickname combo image(s) to ${NICKNAME_DIR}`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
}

// Two-color crowns: blend the existing single-color crowns (e.g. w.png + u.png)
// left/right with a centre gradient, for both the full-res and the low-res
// `<color>Thumb.png` variants. The crowns already carry their own transparent
// silhouette, and all share the same shape, so the first crown doubles as the
// mask when carving (exactly like the nickname plates). Only the two-color
// WUBRG combinations are produced; single colors, inner crowns and the
// gold/land/colorless/artifact crowns are left untouched. This runs for the
// base crowns and the `floating` and `nickname` crown styles.
async function generateCrownCombos() {
  // Base crown dir plus the floating/nickname style subdirectories. All use
  // the same single-letter `<color>.png` / `<color>Thumb.png` naming.
  const crownDirs = [
    { label: 'crown', dir: CROWN_DIR },
    { label: 'crown/floating', dir: path.join(CROWN_DIR, 'floating') },
    { label: 'crown/nickname', dir: path.join(CROWN_DIR, 'nickname') },
  ];

  // Generate the full-res crowns (`w.png`) and the low-res thumbs
  // (`wThumb.png`) as separate passes, since the two sets have different sizes.
  const passes = [
    { suffix: '', comboSuffix: '' },
    { suffix: 'Thumb', comboSuffix: 'Thumb' },
  ];

  for (const { label, dir } of crownDirs) {
    for (const pass of passes) {
      const crowns = new Map();
      for (const color of VARIANT_COLORS) {
        const sourcePath = path.join(dir, `${color}${pass.suffix}.png`);
        if (fs.existsSync(sourcePath)) {
          crowns.set(color, await Jimp.read(sourcePath));
        }
      }

      let written = 0;
      const skipped = [];
      const passLabel = `${label}${pass.suffix ? ` (${pass.suffix})` : ''}`;

      for (const combo of COMBINATIONS) {
        const [c1, c2] = combo.split('');
        const crown1 = crowns.get(c1);
        const crown2 = crowns.get(c2);

        if (!crown1 || !crown2) {
          const missing = [!crown1 && c1, !crown2 && c2].filter(Boolean).join(', ');
          skipped.push(`${combo}${pass.suffix} (source missing: ${missing})`);
          continue;
        }

        const { width, height } = crown1.bitmap;
        if (!sameSize(crown2, width, height)) {
          skipped.push(`${combo}${pass.suffix} (source sizes differ)`);
          continue;
        }

        // The first crown doubles as the mask: its own alpha defines the shape.
        const out = carveCombo(crown1, crown2, crown1);
        await out.write(path.join(dir, `${combo}${pass.comboSuffix}.png`));
        written += 1;
        console.log(`${passLabel}  ✓ ${combo}${pass.comboSuffix}.png`);
      }

      console.log(`\nDone. Wrote ${written} ${passLabel} crown image(s) to ${dir}`);
      if (skipped.length > 0) {
        console.log(`Skipped ${skipped.length}:`);
        for (const s of skipped) console.log(`  - ${s}`);
      }
    }
  }
}

run().catch(err => {
  console.error('Failed to generate parts:', err);
  process.exit(1);
});
