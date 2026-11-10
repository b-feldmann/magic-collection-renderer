// Electron side of `npm run render:card`: loads the render page offscreen,
// draws each requested card face and saves the captured pixels as PNG.
// Started by render-card.mjs with `--job=<path to job json>`.
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const jobArg = process.argv.find(arg => arg.startsWith('--job='));
if (!jobArg) {
  console.error('Missing --job=<file> argument.');
  process.exit(1);
}
const job = JSON.parse(fs.readFileSync(jobArg.slice('--job='.length), 'utf8'));

// One CSS pixel per image pixel, regardless of the display's scaling.
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.disableHardwareAcceleration();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const waitForRenderer = async webContents => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const ready = await webContents
      .executeJavaScript('typeof window.__renderCard === "function"')
      .catch(() => false);
    if (ready) return;
    await sleep(100);
  }
  throw new Error('The render page did not load in time.');
};

const run = async () => {
  const win = new BrowserWindow({
    show: false,
    width: job.width,
    height: job.height,
    useContentSize: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true, backgroundThrottling: false },
  });
  // The constructor clamps the window to the screen height; resizing doesn't.
  win.setContentSize(job.width, job.height);
  win.webContents.on('console-message', event => {
    if (event.level === 'warning' || event.level === 'error') {
      console.error(`[render page] ${event.message}`);
    }
  });

  await win.loadURL(job.url);
  await waitForRenderer(win.webContents);

  for (const face of job.faces) {
    const size = await win.webContents.executeJavaScript(
      `window.__renderCard(${JSON.stringify(face.render)})`,
    );
    const image = await win.webContents.capturePage({
      x: 0,
      y: 0,
      width: Math.round(size.width),
      height: Math.round(size.height),
    });
    fs.writeFileSync(face.outPath, image.toPNG());
    console.log(`Saved ${face.outPath} (${image.getSize().width}x${image.getSize().height})`);
  }
};

app
  .whenReady()
  .then(run)
  .then(() => app.exit(0))
  .catch(error => {
    console.error(error);
    app.exit(1);
  });
