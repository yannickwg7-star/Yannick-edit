// Renders film.js to PNG frames with headless Chromium (parallel pages).
// usage: node render.cjs [outDir] [frame,frame,...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(process.argv[2] || 'frames');
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
let TOTAL;
const WORKERS = 4;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const url = 'file://' + path.join(__dirname, 'index.html') + '?render';
  let next = 0, done = 0, frames = only || [];
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
    await page.goto(url);
    await page.evaluate(() => window.ready);
    if (!TOTAL) { const m = await page.evaluate(() => window.META); TOTAL = Math.round(m.FPS * m.DUR); frames = only || Array.from({ length: TOTAL }, (_, i) => i); }
    while (!TOTAL && !only) await new Promise(r => setTimeout(r, 50));
    while (next < frames.length) {
      const f = frames[next++];
      const data = await page.evaluate(f => window.renderFrame(f), f);
      fs.writeFileSync(path.join(outDir, `f${String(f).padStart(4, '0')}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
      if (++done % 60 === 0) console.log(`${done}/${frames.length}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }));
  await browser.close();
  console.log(`done ${done} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})();
