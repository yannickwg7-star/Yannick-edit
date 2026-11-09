# 1% better every day

A 16-second explainer motion piece (1080×1920, 30fps) built in code. One continuous camera moves through a single world:
1. A cube becomes the first step.
2. The steps grow exponentially, following 1.01^x.
3. The staircase morphs into the curve, and a live multiplier rides it to 37.8×.
4. The curve fills into a mountain.
5. The camera dives back into the first cube, so the video loops.

The kinetic words follow the voiceover script. `audio.py` is the original score.

```
python3 audio.py music.wav
node render.cjs frames
ffmpeg -framerate 30 -i frames/f%04d.png -i music.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest one-percent.mp4
```

Voiceover script: "If you get just 1% better every day… nobody will notice. Not in a week. Not in a month. But after one year… you're not 1% better. You're thirty-seven times better. Small steps. Every day."
