// Longest edge of a stored cover. The big card view renders the art at roughly
// card width on high-DPI screens, so anything much smaller looks soft there.
export const MAX_DIMENSION = 1600;

// Images already within MAX_DIMENSION are kept byte-for-byte unless their data
// URL is larger than this (e.g. an uncompressed PNG), avoiding a lossy re-encode.
export const KEEP_ORIGINAL_MAX_LENGTH = 1_500_000;

const QUALITY = 0.92;

export const getTargetSize = (width: number, height: number, maxDimension = MAX_DIMENSION) => {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

// Halves the image until it is within 2x of the target before the final draw.
// A single large downscale skips source pixels and produces aliasing.
const drawScaled = (img: HTMLImageElement, width: number, height: number) => {
  let source: CanvasImageSource = img;
  let sourceWidth = img.naturalWidth || img.width;
  let sourceHeight = img.naturalHeight || img.height;

  while (sourceWidth / 2 >= width && sourceHeight / 2 >= height) {
    const step = createCanvas(Math.round(sourceWidth / 2), Math.round(sourceHeight / 2));
    const stepCtx = step.getContext('2d');
    if (!stepCtx) break;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    sourceWidth = step.width;
    sourceHeight = step.height;
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
};

// WebP keeps transparency and compresses far better than JPEG at the same
// quality. Browsers that cannot encode WebP silently return PNG instead; fall
// back to JPEG there so the stored data stays small.
const encode = (canvas: HTMLCanvasElement) => {
  const webp = canvas.toDataURL('image/webp', QUALITY);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', QUALITY);
};

const resizeImage = (base64: string, cb: (image: string) => void) => {
  const img = new Image();

  img.onload = () => {
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    const fitsAlready = Math.max(naturalWidth, naturalHeight) <= MAX_DIMENSION;

    if (fitsAlready && base64.length <= KEEP_ORIGINAL_MAX_LENGTH) {
      cb(base64);
      return;
    }

    const { width, height } = getTargetSize(naturalWidth, naturalHeight);
    const canvas = drawScaled(img, width, height);
    if (!canvas) {
      cb(base64);
      return;
    }

    const encoded = encode(canvas);
    // Never replace a small enough original with a bigger re-encode.
    cb(fitsAlready && encoded.length >= base64.length ? base64 : encoded);
  };
  img.onerror = () => cb(base64);

  img.src = base64;
};

export default resizeImage;
