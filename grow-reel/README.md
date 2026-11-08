# "When God wants you to grow": Instagram Reel

A 9:16 Reel (1080×1920, 30fps, 14s). Every shot is an original illustration drawn in code. There is no stock footage or anime.

| Time | Shot | Caption |
|---|---|---|
| 0–3.2s | Black, drifting dust | When God wants you to grow |
| 3.2s | Figure curled up in a rainy alley | They make you depressed |
| 4.6s | Empty sunlit classroom, one student | They make you lonely |
| 6.0s | Lone figure in a sunset field | They make you tired |
| 7.4s | Figure hunched on a swing at night | They make you uncomfortable |
| 8.8s | Black, heartbeat | (none) |
| 9.3s | Champion with arms raised, backlit, crowd | But they never make you fail |

Captions live in `SHOTS` and `renderScene` in `reel.js`. The score is in `audio.py`.

```
python3 audio.py grow.wav
node render.cjs frames
ffmpeg -framerate 30 -i frames/f%04d.png -i grow.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest grow-reel.mp4
```
