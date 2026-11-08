// Feeds source frames into comp.js and writes output PNGs.
// usage: node compose.cjs <clipsDir> <outDir> [frame,frame,...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const clips = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
const { segments } = JSON.parse(fs.readFileSync(path.join(clips, 'segments.json')));
const FPS = 30, TOTAL = Math.round(10.8 * FPS);

function source(f) {
  const t = f / FPS;
  const seg = segments.find(s => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  if (!seg) return [null, null];
  const idx = Math.min(seg.n, Math.floor((t - seg.t0) * FPS + 1e-6) + 1);
  const file = path.join(clips, seg.dir, String(idx).padStart(4, '0') + '.jpg');
  return ['data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64'), seg];
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const frames = only || Array.from({ length: TOTAL }, (_, i) => i);
  let next = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: 4 }, async () => {
    const page = await browser.newPage();
    page.on('pageerror', e => { console.error(e); process.exit(1); });
    await page.goto('file://' + path.join(__dirname, 'index.html'));
    await page.evaluate(() => window.ready);
    while (next < frames.length) {
      const f = frames[next++];
      const [data, seg] = source(f);
      const png = await page.evaluate(([f, d, s]) => window.renderFrame(f, d, s), [f, data, seg]);
      fs.writeFileSync(path.join(out, `f${String(f).padStart(4, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
    }
  }));
  await browser.close();
  console.log(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})();
