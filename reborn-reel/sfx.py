"""SFX for the REBORN reel cut (motion-reel style). Mixed under the speech.

usage: python3 audio.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 45.7
N = int(SR * DUR)
rng = np.random.default_rng(3)
dry = np.zeros((N, 2))
wet = np.zeros((N, 2))  # reverb send


def place(sig, t0, gain=1.0, pan=0.0, send=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    st = np.stack([sig * l, sig * r], 1) * gain * 1.414
    dry[i:i + len(sig)] += st
    wet[i:i + len(sig)] += st * send


def tvec(d):
    return np.arange(int(d * SR)) / SR


def lowpass(x, fc):
    """One-pole lowpass; fc may be a scalar or per-sample array."""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


# ── instruments ──
def kick(d=0.5, f0=160, f1=42):
    t = tvec(d)
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + 0.3 * noise(d) * np.exp(-t * 300)


def snare(d=0.3):
    t = tvec(d)
    n = noise(d)
    n = n - lowpass(n, 1200)
    return 0.8 * n * np.exp(-t * 16) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)


def hat(d=0.06, open_=False):
    t = tvec(d)
    n = noise(d)
    n = n - lowpass(n, 7000)
    return n * np.exp(-t * (25 if open_ else 90))


def blip(f=1200, d=0.12, decay=35):
    t = tvec(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * decay) * np.minimum(1, t * 2000)


def pluck(f, d=0.9):
    t = tvec(d)
    s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (4 + 5 * k)) / k for k in range(1, 6))
    return s * np.minimum(1, t * 800)


def whoosh(d, f0=300, f1=6000, rev=False):
    n = noise(d)
    fc = np.geomspace(f0, f1, len(n))
    hp = n - lowpass(n, fc * 0.4)
    y = lowpass(hp, fc)
    env = np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2
    y = y * env
    return y[::-1] if rev else y


def riser(d, f0=200, f1=9000):
    n = noise(d)
    x = np.linspace(0, 1, len(n))
    y = lowpass(n, f0 * (f1 / f0) ** x) * x ** 2
    t = tvec(d)
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (x * 3)) / SR) * x ** 3 * 0.3
    return y * 2.2 + tone


def impact(d=2.0, f=38):
    t = tvec(d)
    boom = np.sin(2 * np.pi * np.cumsum(f + 90 * np.exp(-t * 18)) / SR) * np.exp(-t * 2.6)
    n = noise(d)
    crash = lowpass(n, 5000 * np.exp(-t * 3) + 200) * np.exp(-t * 4)
    return boom * 1.1 + crash * 1.4


def pad(freqs, d, attack=0.4, release=1.0):
    t = tvec(d)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            s += sum(np.sin(2 * np.pi * ff * k * t + k) / k ** 1.6 for k in range(1, 5))
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    return s / (len(freqs) * 3) * env


def sub(f, d, decay=3.0):
    t = tvec(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * decay) * np.minimum(1, t * 300)


def stab(freqs, d=0.25):
    t = tvec(d)
    s = sum(np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * 2.0 * t) * 0.5 for f in freqs)
    return lowpass(s / len(freqs), 2500 * np.exp(-t * 10) + 300) * np.exp(-t * 8)


A1, A2, C3, E3, G3, A3, B3, C4, D4, E4, G4, A4, C5, E5 = 55, 110, 130.8, 164.8, 196, 220, 246.9, 261.6, 293.7, 329.6, 392, 440, 523.3, 659.3


def knock():
    t = tvec(0.25)
    return (lowpass(noise(0.25), 900) * np.exp(-t * 45) * 1.6 + np.sin(2 * np.pi * 170 * t) * np.exp(-t * 30))


def tick():
    return blip(2600, 0.03, 140) + hat(0.03) * 0.4


def glass(d=0.9):
    n = noise(d); t = tvec(d)
    hp = n - lowpass(n, 5000)
    tones = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (6 + i)) for i, f in enumerate([2900, 4100, 5300, 6700]))
    return (hp * np.exp(-t * 7) + tones * 0.15)


def clank():
    t = tvec(0.6)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (5 + i * 2)) / (1 + i) for i, f in enumerate([420, 980, 1610, 2380])) + noise(0.6) * np.exp(-t * 60) * 0.4


def hum(d, f0, f1):
    t = tvec(d); f = np.geomspace(f0, f1, len(t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 1.5 + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * (t / d) ** 2



import re
PH = [(0.05, 1.9, "THAT VERSION|OF MYSELF|IS A MEMORY."), (2.0, 3.4, "I DON'T|NEED IT|ANYMORE."), (3.7, 5.1, "I|WANT|TO|WIN."), (5.35, 6.8, "NOW IS|THE TIME"), (6.95, 8.3, "TO BE|REBORN"),
      (9.4, 12.3, "NO MATTER HOW MUCH|YOU KNOCK ON THE DOOR|TO SOMEONE'S HEART"), (12.45, 14.6, "IN THE END|YOU CAN'T|CHANGE THEM."), (15.4, 17.0, "WHICH IS WHY|YOU HAVE TO BE|THE ONE"), (17.4, 19.4, "TO CHANGE|YOURSELF."),
      (19.5, 22.2, "WHEN THE WORLD|AROUND YOU ISN'T|FOLLOWING YOUR PLAN"), (22.4, 23.9, "THE ONLY WAY|TO FIX IT"), (24.0, 25.6, "IS TO|FIX YOU."), (25.9, 28.3, "IF I CAN'T SEE THE LIGHT|THAT LEADS|TO THE GOAL"),
      (28.45, 30.5, "THEN I NEED TO|BECOME|THE LIGHT."), (31.3, 33.3, "WATCH ME,|I'LL DEVOUR IT"), (33.4, 35.2, "AND TURN IT|INTO LIGHT."), (35.9, 37.4, "IF IT MEANS|WINNING"), (37.5, 40.4, "I DON'T MIND|DESTROYING|MY OWN SELF."),
      (41.3, 43.5, "I'LL BE|REBORN AGAIN"), (43.6, 45.7, "AS MANY TIMES|AS IT TAKES")]
syl = lambda w: max(1, len(re.findall(r'[aeiouy]+', re.sub(r'[^a-z]', '', w.lower()))))
WIN = [(0.05, 1.9), (2.1, 3.5), (3.8, 5.2), (5.5, 6.9), (7.1, 8.2), (9.4, 12.2), (12.4, 14.5), (15.5, 16.9), (17.4, 18.6), (19.7, 22.0),
       (22.5, 23.6), (23.8, 24.9), (25.9, 28.3), (28.5, 30.4), (31.5, 33.2), (33.4, 34.7), (35.8, 37.2), (37.5, 39.9), (41.6, 43.2), (43.6, 45.4)]
EXACT = {7: [15.5, 15.8, 16.4], 8: [17.4, 17.9], 11: [23.8, 24.1], 14: [31.5, 32.0], 15: [33.4, 34.4], 16: [35.8, 36.2], 18: [41.6, 41.85]}
for i, (_, _, txt) in enumerate(PH):
    lines = txt.split('|')
    if i in EXACT: times = EXACT[i]
    else:
        t0, t1 = WIN[i]; wts = [sum(syl(w) for w in l.split()) for l in lines]; tot = sum(wts); acc = 0; times = []
        for wv in wts: times.append(t0 + (t1 - t0) * 0.9 * acc / tot); acc += wv
    for j, tt in enumerate(times):
        place(blip(1500 + (j % 3) * 260, 0.05, 80), tt, 0.08, (j % 2 - 0.5) * 0.4, 0.3)
SC = [2.0, 3.7, 5.35, 6.95, 9.4, 15.3, 17.4, 19.5, 25.85, 30.7, 33.4, 35.9, 37.5, 41.3]
for s0 in SC:
    place(whoosh(0.4, 400, 11000), s0 - 0.36, 0.4, 0.3 if int(s0) % 2 else -0.3, 0.3)
DR = [6.95, 17.4, 24.0, 28.45, 33.4, 37.5, 41.3]
for d0 in DR:
    place(riser(1.1, 200, 12000), d0 - 1.1, 0.3); place(impact(2.0, 34), d0, 0.9, 0, 0.6); place(sub(41, 1.3, 2.2), d0, 0.5)
place(blip(1760, 0.25, 16), 0.05, 0.3, 0, 0.6)             # the dot
for t0 in (0.6, 1.2): place(blip(1320, 0.15, 25), t0, 0.2, 0, 0.6)
place(whoosh(0.45, 300, 9000), 2.0, 0.5)                   # line stretch
for i, tt in enumerate([2.45, 2.52, 2.6, 2.66, 2.72, 2.8]): place(whoosh(0.16, 800, 7000), tt, 0.22, (-1) ** i * 0.6)
for k in range(10): place(blip(2400 - k * 160, 0.05, 60), 5.12 + k * 0.025, 0.16, (-1) ** k * 0.5)   # slices
tt, gap = 5.4, 0.12
while tt < 6.9: place(tick(), tt, 0.14, 0.2); tt += gap; gap = max(0.03, gap * 0.93)                 # timecode
for k in [9.9, 10.3, 10.7, 11.25, 11.65, 12.05]: place(knock(), k, 0.7, -0.2, 0.4); place(kick(0.3, 160, 60), k, 0.35)
place(impact(0.6, 70), 13.1, 0.35)                          # strike-through
place(pluck(784, 0.8), 16.45, 0.2, 0, 0.6)                  # the one
for k in range(4): place(stab([261.6 * 2 ** (k / 4), 329.6 * 2 ** (k / 4), 392 * 2 ** (k / 4)], 0.25), 17.4 + k * 0.736, 0.25, 0, 0.3)
gl = tvec(1.3); place(np.sin(2 * np.pi * np.cumsum(300 + 400 * np.sin(gl * 9) * np.exp(-gl)) / SR) * 0.3, 20.6, 0.2, 0.3, 0.4)   # elastic chaos
for k in range(8): place(tick(), 22.5 + k * 0.16, 0.08, -0.3)                                       # dragging handles
place(pluck(1046, 0.6), 24.05, 0.2, 0, 0.6)
place(pad([55, 82.4, 110], 2.6, 0.5, 0.4), 25.9, 0.3, 0, 0.6)
place(hum(1.4, 60, 240), 27.05, 0.22, 0, 0.3)
place(lowpass(noise(2.1), 220) * np.minimum(1, tvec(2.1) / 2.1) ** 1.2, 31.3, 0.5, 0, 0.3)
place(whoosh(1.1, 9000, 150), 32.3, 0.4)
for k in range(6): place(kick(0.35, 200, 50), 33.4 + k * 0.368, 0.8); place(hat(0.12, True), 33.4 + k * 0.368, 0.2, 0.3)
for k in range(10): place(hat(0.03), 37.6 + k * 0.05, 0.12, (k % 2 - 0.5) * 0.8)                   # glitch
place(glass(1.0), 37.5, 0.35, 0, 0.5)
for tt, g in ((42.35, 0.5), (42.48, 0.25), (42.54, 0.12)): place(pluck(880 * 2, 0.5), tt, g, 0.1, 0.6); place(kick(0.2, 300, 120), tt, g * 0.6)   # dot bounce
for c0 in (43.6, 44.4, 45.05): place(stab([523.3, 659.3, 784], 0.25), c0, 0.3, 0, 0.4)
place(sub(36, 0.6, 4), 45.3, 0.5)
d, w = dry, wet
ir_t = tvec(1.6)
ir = rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
ir[:, 0] = lowpass(ir[:, 0], 6000); ir[:, 1] = lowpass(ir[:, 1], 6000)
nfft = 1 << int(np.ceil(np.log2(N + len(ir_t))))
rev = np.stack([np.fft.irfft(np.fft.rfft(w[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], 1)
rev *= 0.25 / (np.abs(rev).max() + 1e-9) * np.abs(w).max()
mix = d + rev * 1.4
mix = np.tanh(mix / np.abs(mix).max() * 1.3); mix = mix * 0.9 / np.abs(mix).max()
with wave.open(sys.argv[1], 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok')
