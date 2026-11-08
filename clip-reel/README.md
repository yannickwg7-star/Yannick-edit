# "When God wants you to grow": clip edit

This edit uses the anime clips and song from the user's own reference screen recordings. The footage and music belong to their owners, so the videos and audio are **not** committed here. Only the editing pipeline is.

1. `python3 build_clips.py <uploads_dir> <clips_dir>` cuts each clip out of the recordings, erases the burned-in captions, upscales the frames and extracts the song.
2. `node compose.cjs <clips_dir> <frames_dir>` renders 1080×1920 frames. `comp.js` handles the beat-synced punch-ins, shake, flashes, blurred fill and caption band.
3. Encode the frames with `<clips_dir>/song.wav` using ffmpeg.
