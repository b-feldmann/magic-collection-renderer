// Split the stacked evolution P/T artwork into independently positioned rows.
// Run with: node scripts/split-leveler-pt.cjs
const path = require('path');
const fs = require('fs');
const { Jimp } = require('jimp');

const imageDir = path.join(__dirname, '../src/components/TemplatingCardRender/images/pt/levelers');
const rows = { top: 0, mid: 198, bottom: 406 };

async function main() {
  for (const row of Object.keys(rows)) {
    fs.mkdirSync(path.join(imageDir, row), { recursive: true });
  }
  for (const color of ['a', 'b', 'g', 'm', 'r', 'u', 'v', 'w']) {
    const source = await Jimp.read(path.join(imageDir, `${color}.png`));
    for (const [row, y] of Object.entries(rows)) {
      await source
        .clone()
        .crop({ x: 0, y, w: 282, h: 154 })
        .write(path.join(imageDir, row, `${color}.png`));
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
