// File name for the PNG download: the original extension is swapped for .png.
export const toPngFileName = (fileName?: string): string => {
  const base = (fileName || '').trim().replace(/\.[^./\\]*$/, '');
  return `${base || 'cover'}.png`;
};

const triggerDownload = (href: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// Re-encodes an image (data URL or same-origin URL) as PNG and saves it.
// Uploaded covers are stored as resized JPEG data URLs, so they always go
// through a canvas to produce a real PNG file.
const downloadImageAsPng = (src: string, fileName?: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      triggerDownload(canvas.toDataURL('image/png'), toPngFileName(fileName));
      resolve();
    };
    img.onerror = () => reject(new Error('Image could not be loaded'));
    img.src = src;
  });

export default downloadImageAsPng;
