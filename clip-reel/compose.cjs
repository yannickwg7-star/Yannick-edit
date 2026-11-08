// Feeds source frames into comp.js and writes output PNGs.
// usage: node compose.cjs <clipsDir> <outDir> [frame,frame,...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const clips = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
const { segments } = JSON.parse(fs.readFileSync(path.join(clips, 'segments.json')));
const FPS = 30, TOTAL = Math.round(9.5 * FPS);
const PAGE = process.env.PAGE || 'index.html';

const jpg = (dir, i) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(clips, dir, String(i).padStart(4, '0') + '.jpg')).toString('base64');
function source(f) {
  const t = f / FPS;
  const si = segments.findIndex(s => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  if (si < 0) return [null, null, null, null];
  const seg = segments[si];
  const idx = Math.min(seg.n, Math.floor((t - seg.t0) * FPS + 1e-6) + 1);
  // previous clip's last frame (for card hand-offs) and story thumbnails (for the finale)
  const prev = si > 0 && t - seg.t0 < 0.4 ? jpg(segments[si - 1].dir, segments[si - 1].n) : null;
  const thumbs = seg === segments[segments.length - 1] ?
    segments.filter(s => s.kind === 'story' || s.kind === 'flash').map(s => jpg(s.dir, Math.min(s.n, 10))) : null;
  return [jpg(seg.dir, idx), seg, prev, thumbs];
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
    await page.goto('file://' + path.join(__dirname, PAGE));
    await page.evaluate(() => window.ready);
    while (next < frames.length) {
      const f = frames[next++];
      const [data, seg, prev, thumbs] = source(f);
      const png = await page.evaluate(([f, d, s, p, th]) => window.renderFrame(f, d, s, p, th), [f, data, seg, prev, thumbs]);
      fs.writeFileSync(path.join(out, `f${String(f).padStart(4, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
    }
  }));
  await browser.close();
  console.log(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})();
