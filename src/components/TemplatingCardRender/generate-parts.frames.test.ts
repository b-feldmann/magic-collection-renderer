import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Jimp } from 'jimp';

const root = path.resolve(__dirname, '../../..');
const imageDir = path.join(root, 'src/components/TemplatingCardRender/images');

describe('m15 frame parts generation', () => {
  it('writes regular and Nyx frames clipped by the frame mask', async () => {
    execFileSync(process.execPath, ['scripts/generate-parts.cjs', 'frame'], {
      cwd: root,
      timeout: 120_000,
      stdio: 'pipe',
    });

    const mask = await Jimp.read(path.join(imageDir, 'parts/frame.png'));
    for (const style of ['regular', 'nyx']) {
      const source = await Jimp.read(path.join(imageDir, 'mainframes/m15', style, 'w.png'));
      const output = await Jimp.read(path.join(imageDir, 'parts/frame', style, 'w.png'));

      expect(output.bitmap.width).toBe(mask.bitmap.width);
      expect(output.bitmap.height).toBe(mask.bitmap.height);

      for (const [x, y] of [
        [0, 0],
        [mask.bitmap.width >> 1, mask.bitmap.height >> 1],
        [mask.bitmap.width - 1, mask.bitmap.height - 1],
      ]) {
        const index = (y * mask.bitmap.width + x) * 4;
        const expectedAlpha = Math.round(
          (source.bitmap.data[index + 3] * mask.bitmap.data[index + 3]) / 255,
        );

        expect(output.bitmap.data[index + 3]).toBe(expectedAlpha);
        if (expectedAlpha > 0) {
          expect(Array.from(output.bitmap.data.subarray(index, index + 3))).toEqual(
            Array.from(source.bitmap.data.subarray(index, index + 3)),
          );
        }
      }
    }

    expect(fs.existsSync(path.join(imageDir, 'parts/frame/regular/w.png'))).toBe(true);
    expect(fs.existsSync(path.join(imageDir, 'parts/frame/nyx/w.png'))).toBe(true);
  }, 120_000);
});
