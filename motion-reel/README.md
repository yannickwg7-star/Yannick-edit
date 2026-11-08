# Motion Reel

A 15-second, 1920×1080 / 60fps motion-graphics piece built entirely in code: no editing timeline and no assets.

- `reel.js` contains every frame as a pure function of time (7 scenes, custom easing, 4-sample 180° motion blur, film grain, HUD).
- `audio.py` synthesizes the 120 BPM score with numpy, timed to the cuts and hits.
- `render.cjs` renders the frames with headless Chromium. Open `index.html` for a live preview.

```
python3 audio.py reel.wav
node render.cjs frames
ffmpeg -framerate 60 -i frames/f%04d.png -i reel.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest motion-reel.mp4
```
