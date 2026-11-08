# "Never Give Up": anime-style Instagram Reel

A 9:16 Reel (1080×1920, 30fps, 15s). It combines the story of the "When God wants you to grow" reference with the fast, beat-cut anime-edit energy of the second reference. Every shot is drawn in code, with no footage from existing anime.

- `never-give-up.mp4`: the full version, with the synthesized score and sound effects.
- `never-give-up_sfx-only.mp4`: sound effects only. Use this one when adding a licensed song from Instagram's music library.

| Time | Shot | Caption |
|---|---|---|
| 0–2.5s | Anime eye close-up in the rain, tear | When God wants you to grow |
| 2.5s | Rainy alley, then a punch-in | They make you depressed |
| 4.0s | Empty classroom, then a punch-in | They make you lonely |
| 5.5s | Sunset field, then a punch-in | They make you tired |
| 7.0s | Night swing, then a punch-in | They make you uncomfortable |
| 8.5s | Kneeling under a red storm and lightning; shocked eye | Give up? |
| 9.75s | Black, heartbeat | (none) |
| 10.25s | Eye ignites gold, then power-up: aura, cracks, debris, lightning, impact frames | I'll Never Give Up |
| 12.75s | Champion raises arms in the ring | But they never make you fail |

Cuts sit on a 120 BPM grid (0.5s and 0.25s).

```
python3 audio.py full.wav sfx.wav
node render.cjs frames
ffmpeg -framerate 30 -i frames/f%04d.png -i full.wav -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -shortest never-give-up.mp4
```
