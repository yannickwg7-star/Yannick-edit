#!/usr/bin/env bash
# Rebuild the "plant a tree" reel. Needs: ffmpeg, node + playwright, python3.
# 1) Put Mixkit sources in src/<id>.mp4 (ids listed in shots.py; https://assets.mixkit.co/videos/<id>/<id>-720.mp4)
# 2) Optional: guide_audio.m4a (timing reference only, not for posting)
set -e
python3 shots.py                                    # graded + zoomed shots -> footage.mp4 (27.5s, 30fps, 1080x1350)
mkdir -p ov
for s in 0 207 414 621; do e=$((s+207)); [ $e -gt 825 ] && e=825; node frames.js $s $e & done; wait   # text/FX overlay frames
FX="[0:v][1:v]overlay=0:0:format=auto,format=gbrp,split[a][b];[b]gblur=sigma=26,curves=all='0/0 0.62/0.1 1/1'[h];[a][h]blend=all_mode=screen:all_opacity=0.45,curves=all='0/0.05 0.5/0.48 1/0.95',rgbashift=rh=2:bh=-2,eq=brightness='0.012*sin(t*41)+0.008*sin(t*17)':eval=frame,vignette=PI/4.3,noise=alls=20:allf=t+u,format=yuv420p,pad=1080:1920:0:285:black[v]"
ffmpeg -y -i footage.mp4 -framerate 30 -i ov/%04d.png -filter_complex "$FX" -map "[v]" \
  -c:v libx264 -preset slow -b:v 14M -maxrate 18M -bufsize 28M -pix_fmt yuv420p -r 30 -profile:v high -movflags +faststart plant-tree-reel_POST_THIS.mp4
