"""Cut, clean (inpaint burned-in captions) and upscale source clips from the reference
screen recordings into per-segment frame folders + segments.json.

usage: python3 build_clips.py <uploads_dir> <out_dir>
"""
import json, os, shutil, subprocess, sys

UP, OUT = sys.argv[1], sys.argv[2]
REF1 = [f for f in os.listdir(UP) if f.startswith('59466f82')][0]
REF2 = [f for f in os.listdir(UP) if f.startswith('f99de216')][0]
REF3 = [f for f in os.listdir(UP) if f.startswith('eaff6518')][0]
FPS = 30
SONG0 = 2.40          # where the song starts in reference 1's recording
BEAT = 0.414          # 144.9 BPM

# crop of the reel picture inside each iPad screen recording, + caption box to erase
PIC = 'crop=690:624:615:318'
TOP3, BOT3 = 'crop=690:492:615:176', 'crop=690:488:615:669'
ERASE = {  # caption box (x, y, w, h) in the cropped picture
    'r1': (90, 280, 512, 70),
    'gu': (190, 262, 310, 92),
    'ng': (150, 270, 390, 84),
    'r3': (262, 214, 168, 64),
}
B = lambda k: round(0.116 + 0.414 * k, 3)   # measured beat grid of the song (144.9 BPM)
SEGS = [  # (start, end, source, rec_time, crop, erase, kind)
    (B(5), B(7), REF3, 5.80, BOT3, 'r3', 'grow'),      # Thorfinn at sunset, inside the word GROW
    # the source here is a strobe montage (new shot every 2 frames), so each flash
    # holds one frame for the whole beat and gets its motion from the compositor
    (B(7), B(8), REF2, 1.80, PIC, 'gu', 'flash'),      # PAIN: Gojo bleeding
    (B(8), B(9), REF2, 3.42, PIC, 'gu', 'flash'),      # LOSS: tear-streaked face
    (B(9), B(10), REF2, 4.05, PIC, 'gu', 'flash'),     # DOUBT: beaten down on the ground
    (B(10), B(11), REF2, 4.42, PIC, 'gu', 'flash'),    # FEAR: Deku crying
    (B(11), B(13), REF1, 7.27, PIC, 'r1', 'story'),    # depressed: Ippo in the alley
    (B(13), B(15), REF3, 9.55, TOP3, 'r3', 'story'),   # lonely: timid boy in the hoodie
    (B(15), B(17), REF3, 3.85, TOP3, 'r3', 'story'),   # tired: Tanjiro carrying the log
    (B(17), B(19), REF3, 7.55, TOP3, 'r3', 'story'),   # anxious: bloodied, shocked
    (B(19), B(21), REF3, 5.80, TOP3, 'r3', 'story'),   # uncomfortable: Thorfinn in the fire
    (B(21), B(22), REF1, 11.43, PIC, 'r1', 'power'),   # BUT THEY: Ippo raises the belt
    (B(22), B(23), REF2, 4.60, PIC, 'ng', 'power'),    # NEVER: glowing aura eyes
    (B(23), B(24), REF3, 8.05, BOT3, 'r3', 'power'),   # MAKE YOU FAIL: Saitama
    (B(24), 10.80, REF2, 9.42, PIC, 'ng', 'power'),    # Goku inside NEVER
]
os.makedirs(OUT, exist_ok=True)
meta = []
for i, (t0, t1, src, rec, crop, er, kind) in enumerate(SEGS):
    d = os.path.join(OUT, f'seg{i}')
    os.makedirs(d, exist_ok=True)
    n = round((t1 - t0) * FPS) + 2
    rawd = d + '_raw'
    os.makedirs(rawd, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{rec:.3f}', '-i', os.path.join(UP, src),
                    '-frames:v', '1' if kind == 'flash' else str(n), '-vf', f'{crop},fps={FPS}', os.path.join(rawd, '%04d.png')], check=True)
    if kind == 'flash':   # hold the single frame
        for k in range(2, n + 1):
            shutil.copy(os.path.join(rawd, '0001.png'), os.path.join(rawd, f'{k:04d}.png'))
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clean_text.py'),
                    rawd, d, *map(str, ERASE[er]), *(['box'] if kind == 'flash' or i == len(SEGS) - 1 else [])], check=True)
    meta.append({'t0': t0, 't1': t1, 'dir': f'seg{i}', 'kind': kind, 'n': len(os.listdir(d))})
# the song in the recording ends at 9.45s (then the original reel loops back to the start):
# fade it out evenly (linear in dB, 0 to -40 dB from 7.6s to 9.45s), then keep silence to the end of the video
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(SONG0), '-t', '9.45', '-i', os.path.join(UP, REF1),
                '-vn', '-af', "volume='if(lt(t,7.6),1,pow(10,-2*(t-7.6)/1.85))':eval=frame,apad=whole_dur=10.5", '-ar', '44100',
                os.path.join(OUT, 'song.wav')], check=True)
json.dump({'segments': meta, 'beat': BEAT}, open(os.path.join(OUT, 'segments.json'), 'w'), indent=1)
print(json.dumps(meta))
