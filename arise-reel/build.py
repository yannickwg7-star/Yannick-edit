"""Cut every shot of the Solo Leveling study edit onto the song's beat grid.
usage: python3 build.py <uploads_dir> <out_dir>"""
import json, os, subprocess, sys
from shots import SRC, vf
UP, OUT = sys.argv[1], sys.argv[2]
FPS = 30
H = 0.233                      # half-beat of the song (128.8 BPM), first beat at 0.008s
T = lambda j: round(0.008 + H * j, 3)
END = 11.67                    # the song ends here (the original reel then loops)
SONG = ('b47927a9', 0.57)      # recording and where the song starts in it
# (name, source time, study framing (zoom, x, y) or None)
INTRO = [('study', 1.6, (1.0, 540, 960)), ('weak', 1.0, None), ('study', 3.0, (1.8, 560, 640)), ('shock', 7.3, None),
         ('study', 9.5, (1.3, 540, 820)), ('girl', 2.6, None), ('study', 13.0, (1.8, 560, 660)), ('weak', 7.2, None)]
DROP = [('white', 4.6, None), ('eye', 11.8, None), ('study', 3.6, (2.2, 570, 640)), ('aura', 2.0, None),
        ('army', 3.3, None), ('clash', 2.6, None), ('army', 9.3, None), ('ice', 1.6, None),
        ('study', 10.0, (1.5, 540, 780)), ('ice', 3.4, None), ('aura', 5.4, None), ('eye', 13.0, None),
        ('study', 0.6, (1.0, 540, 960)), ('weak', 1.6, None), ('aura', 9.5, None), ('ice', 4.2, None),
        ('study', 14.0, (1.6, 560, 700)), ('shock', 7.9, None), ('clash', 4.6, None), ('aura', 2.2, None)]
PUSH = [('ice', 9.2, None), ('eye', 13.4, None), ('ice', 12.2, None), ('army', 3.6, None),
        ('eye', 12.1, None), ('aura', 12.0, None), ('ice', 3.9, None), ('white', 5.4, None)]
ARISE = [('army', 9.8, None), ('army', 3.4, None), ('ice', 10.0, None)]

slots = []
for i, s in enumerate(INTRO): slots.append((0 if i == 0 else T(2 * i), T(2 * i + 2), *s, 'intro'))
for i, s in enumerate(DROP): slots.append((T(16 + i), T(17 + i), *s, 'drop'))
for i, s in enumerate(PUSH): slots.append((T(36 + i), T(37 + i), *s, 'push'))
for i, s in enumerate(ARISE): slots.append((T(44 + 2 * i), END if i == 2 else T(46 + 2 * i), *s, 'arise'))

src = lambda n: os.path.join(UP, [f for f in os.listdir(UP) if f.startswith(SRC[n])][0])
os.makedirs(OUT, exist_ok=True)
meta = []
for k, (t0, t1, name, st, study, part) in enumerate(slots):
    d = os.path.join(OUT, f's{k:02d}'); os.makedirs(d, exist_ok=True)
    n = round((t1 - t0) * FPS) + 2
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{st:.3f}', '-i', src(name), '-frames:v', str(n),
                    '-vf', f'fps={FPS},{vf(name, study=study)}', '-q:v', '2', os.path.join(d, '%04d.jpg')], check=True)
    meta.append({'t0': t0, 't1': t1, 'dir': f's{k:02d}', 'name': name, 'part': part, 'n': len(os.listdir(d))})
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(SONG[1]), '-t', str(END), '-i', os.path.join(UP, [f for f in os.listdir(UP) if f.startswith(SONG[0])][0]),
                '-vn', '-ar', '44100', '-ac', '2', os.path.join(OUT, 'song.wav')], check=True)
json.dump({'segments': meta}, open(os.path.join(OUT, 'segments.json'), 'w'), indent=1)
print(len(meta), 'slots')
