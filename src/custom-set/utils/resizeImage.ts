const MAX_WIDTH = 360;
const MAX_HEIGHT = 510;

const resizeImage = (base64: string, cb: (image: string) => void) => {
  const img = new Image();
  img.src = base64;

  img.onload = function() {
    // @ts-ignore
    const canvas: HTMLCanvasElement = document.getElementById('cover-resize-canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.log('canvas is null');
      cb(base64);
      return;
    }

    ctx.drawImage(img, 0, 0);

    let { width, height } = img;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
    } else if (height > MAX_HEIGHT) {
      width *= MAX_HEIGHT / height;
      height = MAX_HEIGHT;
    }
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);
    cb(canvas.toDataURL('image/jpeg'));
  };
};

export default resizeImage;
