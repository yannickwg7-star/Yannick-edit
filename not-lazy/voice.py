"""AI narration (Kokoro, runs locally). Each line is placed so a chosen anchor word lands on its
visual beat; the on-screen word timings are then derived from the voice (words.json).
usage: python3 voice.py <model.onnx> <voices.bin> <out.wav> <words.json> [voice]"""
import sys, re, json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
model, voices, out, wj = sys.argv[1:5]
VOICE = sys.argv[5] if len(sys.argv) > 5 else 'am_michael'
SR = 24000
# (text, anchor word index, time that word should land on, speed)
LINES = [
    ("You think you're lazy.", 3, 1.20, 1.0),
    ("Most people believe procrastination means no discipline.", 0, 3.0, 1.16),
    ("But research says the opposite.", 0, 6.45, 1.05),
    ("It's not a time problem.", 3, 10.30, 1.0),
    ("It's an emotion problem.", 2, 11.65, 1.0),
    ("You avoid the task,", 0, 12.78, 1.18),
    ("to avoid the fear.", 3, 14.62, 1.0),
    ("Start small.", 0, 15.55, 0.95),
]
def syl(w):
    n = len(re.findall(r'[aeiouy]+', w.lower().replace("'", '')))
    return max(1, n) + (0.6 if w[-1] in '.,' else 0)
k = Kokoro(model, voices)
track = np.zeros(int(18.0 * SR)); words = []
for text, ai, at, speed in LINES:
    a, sr = k.create(text, voice=VOICE, speed=speed, lang='en-us')
    a = np.asarray(a, dtype=np.float32)
    nz = np.where(np.abs(a) > 0.012)[0]; a = a[max(0, nz[0] - 120): nz[-1] + 1500]
    ws = text.split(); w8 = [syl(w) for w in ws]; dur = len(a) / sr - 0.06
    starts = np.concatenate([[0], np.cumsum(w8)[:-1]]) / sum(w8) * dur
    t0 = at - starts[ai]
    i = int(t0 * SR); track[i:i + len(a)] += a[:len(track) - i]
    for w, s in zip(ws, starts): words.append([round(t0 + s, 3), w.strip(',').upper()])
    print(f'{t0:5.2f}-{t0 + len(a)/sr:5.2f}s  {text}')
track /= max(1e-6, np.abs(track).max()) / 0.95
sf.write(out, track, SR)
json.dump(words, open(wj, 'w'))
