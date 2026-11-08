"""Cut, clean (inpaint burned-in captions) and upscale source clips from the reference
screen recordings into per-segment frame folders + segments.json.

usage: python3 build_clips.py <uploads_dir> <out_dir>
"""
import json, os, subprocess, sys

UP, OUT = sys.argv[1], sys.argv[2]
REF1 = [f for f in os.listdir(UP) if f.startswith('59466f82')][0]
REF2 = [f for f in os.listdir(UP) if f.startswith('f99de216')][0]
REF3 = [f for f in os.listdir(UP) if f.startswith('eaff6518')][0]
FPS = 30
SONG0 = 2.40          # where the song starts in reference 1's recording
BEAT = 0.4167         # ~144 BPM

# crop of the reel picture inside each iPad screen recording, + caption box to erase
PIC = 'crop=690:624:615:318'
TOP3, BOT3 = 'crop=690:492:615:176', 'crop=690:488:615:669'
ERASE = {  # caption box (x, y, w, h) in the cropped picture
    'r1': (90, 280, 512, 70),
    'gu': (190, 262, 310, 92),
    'ng': (150, 270, 390, 84),
    'r3': (262, 214, 168, 64),
}
b = lambda k: round(4.87 - (4 - k) * BEAT, 3)
SEGS = [  # (start, end, source, rec_time, crop, erase, kind)
    (2.37, b(0), REF3, 5.80, BOT3, 'r3', 'grow'),     # Thorfinn at sunset, inside the word GROW
    (b(0), b(1), REF2, 4.25, PIC, 'gu', 'flash'),     # Deku crying
    (b(1), b(2), REF2, 3.25, PIC, 'gu', 'flash'),     # crying, face streaked
    (b(2), b(3), REF2, 1.75, PIC, 'gu', 'flash'),     # beaten down
    (b(3), 4.87, REF2, 2.50, PIC, 'gu', 'flash'),     # Hinata, scared
    (4.87, 5.70, REF1, 7.27, PIC, 'r1', 'story'),     # depressed: Ippo in the alley
    (5.70, 6.50, REF3, 9.55, TOP3, 'r3', 'story'),    # lonely: timid boy in the hoodie
    (6.50, 7.30, REF3, 3.85, TOP3, 'r3', 'story'),    # tired: Tanjiro carrying the log
    (7.30, 8.17, REF3, 7.55, TOP3, 'r3', 'story'),    # anxious: bloodied, shocked
    (8.17, 9.03, REF3, 5.80, TOP3, 'r3', 'story'),    # uncomfortable: Thorfinn in the fire
    (9.03, 9.03 + BEAT, REF1, 11.43, PIC, 'r1', 'power'),              # Ippo raises the belt
    (9.03 + BEAT, 9.03 + 2 * BEAT, REF2, 4.60, PIC, 'ng', 'power'),    # glowing aura eyes
    (9.03 + 2 * BEAT, 9.03 + 3 * BEAT, REF3, 8.05, BOT3, 'r3', 'power'),  # Saitama
    (9.03 + 3 * BEAT, 10.80, REF2, 9.42, PIC, 'ng', 'power'),          # Goku Super Saiyan
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
                    '-frames:v', str(n), '-vf', f'{crop},fps={FPS}', os.path.join(rawd, '%04d.png')], check=True)
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clean_text.py'),
                    rawd, d, *map(str, ERASE[er]), *(['box'] if kind == 'flash' or i == len(SEGS) - 1 else [])], check=True)
    meta.append({'t0': t0, 't1': t1, 'dir': f'seg{i}', 'kind': kind, 'n': len(os.listdir(d))})
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(SONG0), '-t', '10.8', '-i', os.path.join(UP, REF1),
                '-vn', '-af', 'afade=t=out:st=10.5:d=0.3', '-ar', '44100', os.path.join(OUT, 'song.wav')], check=True)
json.dump({'segments': meta, 'beat': BEAT}, open(os.path.join(OUT, 'segments.json'), 'w'), indent=1)
print(json.dumps(meta))
