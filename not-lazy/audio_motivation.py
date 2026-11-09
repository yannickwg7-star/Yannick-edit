"""Motivational score + sound design (23.5s) for the narrated cut.

usage: python3 audio.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 23.5
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


A2, C3, E3, G3, A3, B3, C4, D4, E4, F4, G4, A4, C5, E5, G5 = 110, 130.8, 164.8, 196, 220, 246.9, 261.6, 293.7, 329.6, 349.2, 392, 440, 523.3, 659.3, 784
F2, F3 = 87.3, 174.6


def piano(f, d=2.0):
    t = tvec(d)
    s = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t * (1.8 + 1.4 * k)) / k ** 1.3 for k in range(1, 7))
    return s * np.minimum(1, t * 700)


def clank(d=0.8):            # metallic hit: inharmonic partials
    t = tvec(d)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (3 + i * 2)) / (1 + i) for i, f in enumerate([520, 1170, 1830, 2610, 3440])) + noise(d) * np.exp(-t * 60) * 0.5


def tick():
    return blip(2400, 0.025, 160) + hat(0.025) * 0.3


def growl(d):
    t = tvec(d)
    f = 45 + 15 * np.sin(2 * np.pi * 3 * t)
    s = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.6 + lowpass(noise(d), 300) * 1.5
    return s * np.minimum(1, t / d) ** 1.5


D3, Bb2, Bb3, D5, G2 = 146.8, 116.5, 233.1, 587.3, 98.0


def strings(fs, d, attack=0.6, release=1.0):
    t = tvec(d)
    s = np.zeros_like(t)
    for f in fs:
        for det in (-0.1, 0.0, 0.12):
            ff = f * 2 ** (det / 12) * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))
            s += lowpass(2 * (ff * t % 1) - 1, 2400)
    return s / (len(fs) * 3) * np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)


# ── 0–6.45 · the accusation: tense pulse ──
place(pad([A2, E3, C4], 6.6, 1.0, 0.8), 0.0, 0.3, 0, 0.6)
for tt in np.arange(0.1, 6.4, 0.5):
    place(tick(), tt, 0.10, 0.3)
    place(kick(0.3, 80, 40), tt, 0.28)
place(impact(0.9, 50), 1.9, 0.3, 0, 0.3)                 # "problem"
place(whoosh(0.5, 500, 12000), 2.8, 0.55, 0.6)           # whip pan
place(clank(1.0), 3.55, 0.35, -0.2, 0.5)
murmur = sum(lowpass(noise(2.9), 600 + 150 * i) * (0.6 + 0.4 * np.sin(2 * np.pi * (3 + i) * tvec(2.9) + i)) for i in range(4))
place(murmur * np.minimum(1, tvec(2.9) / 0.4) * np.minimum(1, (2.9 - tvec(2.9)) / 0.5), 3.3, 0.16, 0, 0.5)
place(riser(0.6, 300, 9000), 5.85, 0.4)

# ── 6.45–12.8 · "but they're wrong": the turn, inside the brain ──
place(impact(1.8, 36), 6.45, 0.85, 0, 0.6)
place(clank(1.2), 6.6, 0.3, 0.3, 0.6)
place(strings([A3, C4, E4], 6.3, 1.2, 1.0), 6.45, 0.25, 0, 0.7)
sand = lowpass(noise(1.0), 9000) - lowpass(noise(1.0), 2500)
place(sand * np.sin(np.linspace(0, np.pi, len(sand))), 7.0, 0.3, -0.5, 0.4)
place(riser(0.5, 200, 14000), 7.85, 0.5)
place(impact(1.2, 34), 8.35, 0.55, 0, 0.7)
under = lowpass(noise(4.0), 500) * 0.9 + np.sin(2 * np.pi * 55 * tvec(4.0)) * 0.3
place(under * np.minimum(1, tvec(4.0) / 0.3) * np.minimum(1, (4.0 - tvec(4.0)) / 0.2), 8.35, 0.25, 0, 0.6)
r2 = np.random.default_rng(5)
for k in range(40):
    place(blip(float(r2.choice([1800, 2400, 3200, 4100])), 0.05, 70), 8.4 + r2.uniform(0, 3.9), 0.045, r2.uniform(-0.9, 0.9), 0.6)
for tt in np.arange(8.35, 11.3, 0.5):
    place(kick(0.4, 110, 40), tt, 0.4)
glass = noise(0.6) - lowpass(noise(0.6), 4000)
place(glass * np.exp(-tvec(0.6) * 8), 10.6, 0.45, -0.3, 0.4)
place(impact(1.0, 44), 10.6, 0.4, 0, 0.4)
hb, tt = 0.6, 11.3
while tt < 12.35:
    place(kick(0.25, 70, 38), tt, 0.7); place(kick(0.2, 70, 38), tt + 0.16, 0.45); tt += hb; hb = max(0.3, hb * 0.82)
place(whoosh(0.45, 8000, 200), 12.3, 0.45)

# ── 12.8–15.35 · the fear grows ──
place(whoosh(0.4, 200, 6000), 12.75, 0.35)
place(growl(1.25), 13.4, 0.55, 0, 0.4)
place(riser(1.2, 120, 3000), 13.4, 0.3)
place(impact(2.0, 30), 14.62, 1.0, 0, 0.6)
place(growl(0.9) * np.exp(-tvec(0.9) * 2.5), 14.62, 0.7, 0, 0.5)

# ── 15.35–23.5 · the anthem: start small, climb, sunrise ──
prog = [(15.35, [C3, E3, G3, C4], C3 / 2), (16.35, [G2, D3, G3, B3], G2), (17.35, [A2, E3, A3, C4], A2), (18.35, [F2, C3, F3, A3], F2),
        (19.35, [C3, E3, G3, C4], C3 / 2), (20.35, [G2, D3, G3, B3], G2), (21.35, [F2, C3, F3, A3], F2)]
for t0, ch, root in prog:
    place(strings([f * 2 for f in ch], 1.1, 0.15, 0.3), t0, 0.32 if t0 >= 17.35 else 0.22, 0, 0.7)
    place(sub(root, 1.0, 1.2), t0, 0.5 if t0 >= 17.35 else 0.3)
for i, (tt, f) in enumerate([(15.45, C5), (15.85, E5), (16.75, D5), (17.75, E5), (18.75, G5), (19.25, E5)]):
    place(piano(f, 1.6), tt, 0.26, (i % 2 - 0.5) * 0.4, 0.8)
for i in range(10):                                       # pages fly into steps
    place(whoosh(0.18, 2000, 11000), 16.7 + i * 0.08, 0.14, (i % 2 - 0.5) * 0.8)
    place(blip(1200 * 2 ** (i / 12), 0.06, 40), 16.95 + i * 0.08, 0.06, (i % 2 - 0.5) * 0.6, 0.5)
for tt in np.arange(17.6, 22.2, 0.5):                     # drums come in as he climbs
    place(kick(0.4, 160, 45), tt, 0.85)
    place(snare(0.35), tt + 0.25, 0.32, 0, 0.4)
for tt in np.arange(17.6, 22.2, 0.125):
    place(hat(0.04), tt, 0.07, 0.3)
for i, tt in enumerate(np.arange(17.6, 21.0, 0.34)):    # a light step sound per page
    place(pluck(C5 * 2 ** ((i % 5) / 12), 0.25), tt + 0.17, 0.08, 0.3, 0.6)
place(riser(1.0, 200, 14000), 21.2, 0.5)
place(impact(2.4, 32), 22.2, 1.0, 0, 0.8)                 # START TODAY
place(strings([C4, E4, G4, C5], 1.3, 0.05, 0.9), 22.2, 0.5, 0, 0.8)
place(pad([C3, G3, E4, C5], 1.3, 0.05, 0.9), 22.2, 0.4, 0, 0.8)
for i, f in enumerate([C5, E5, G5, C5 * 2]):
    place(pluck(f, 0.9), 22.22 + i * 0.05, 0.16, (i - 1.5) * 0.4, 0.8)

# ── mix ──
ir_t = tvec(1.6)
ir = rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
ir[:, 0] = lowpass(ir[:, 0], 6000)
ir[:, 1] = lowpass(ir[:, 1], 6000)
L = N + len(ir_t)
nfft = 1 << int(np.ceil(np.log2(L)))
rev = np.stack([np.fft.irfft(np.fft.rfft(wet[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], 1)
rev *= 0.25 / (np.abs(rev).max() + 1e-9) * np.abs(wet).max()
mix = dry + rev * 1.6
mix = np.tanh(mix / np.abs(mix).max() * 1.6)
fade = np.minimum(1, (DUR - np.arange(N) / SR) / 0.25)[:, None]
mix = mix * fade * 0.89 / np.abs(mix).max()
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'reel.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok')
