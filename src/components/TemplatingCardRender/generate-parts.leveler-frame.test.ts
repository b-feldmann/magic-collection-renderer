import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Jimp } from 'jimp';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(__dirname, '../../..');
const imageDir = path.join(root, 'src/components/TemplatingCardRender/images');

describe('leveler frame parts generation', () => {
  it('writes regular and Nyx M15 frames clipped by the leveler frame mask', async () => {
    execFileSync(process.execPath, ['scripts/generate-parts.cjs', 'levelerFrame'], {
      cwd: root,
      timeout: 120_000,
      stdio: 'pipe',
    });

    const maskSvg = fs.readFileSync(path.join(imageDir, 'parts/levelerFrame.svg'), 'utf8');
    const mask = await Jimp.read(new Resvg(maskSvg).render().asPng());

    for (const style of ['regular', 'nyx']) {
      const source = (
        await Jimp.read(path.join(imageDir, 'mainframes/m15', style, 'w.png'))
      ).resize({ w: mask.bitmap.width, h: mask.bitmap.height });
      const output = await Jimp.read(path.join(imageDir, 'parts/levelerFrame', style, 'w.png'));

      expect(output.bitmap.width).toBe(mask.bitmap.width);
      expect(output.bitmap.height).toBe(mask.bitmap.height);

      for (let index = 0; index < output.bitmap.data.length; index += 4) {
        const expectedAlpha = Math.round(
          (source.bitmap.data[index + 3] * mask.bitmap.data[index + 3]) / 255,
        );
        if (output.bitmap.data[index + 3] !== expectedAlpha) {
          throw new Error(`Unexpected alpha at pixel ${index / 4} for ${style} leveler frame`);
        }
      }
    }
  }, 120_000);
});
