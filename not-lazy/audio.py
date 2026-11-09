"""Synthesized 17.5s score and sound design for "You're not lazy, you're scared".

usage: python3 audio.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 18.0
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


WORDS = [0.30, 0.55, 0.85, 1.20, 3.20, 3.45, 3.80, 4.25, 5.05, 5.35, 5.65, 6.45, 6.80, 7.20, 7.45, 7.70, 9.70, 9.90, 10.10, 10.30, 10.75,
         11.25, 11.45, 11.65, 12.10, 12.95, 13.15, 13.40, 13.60, 13.95, 14.15, 14.40, 14.62, 15.55, 15.95]
for i, tt in enumerate(WORDS):
    place(blip(1600 + (i % 3) * 200, 0.04, 90), tt, 0.06, (i % 2 - 0.5) * 0.4)

# ── 0–2.95 · the lamp-lit desk ──
hum = lowpass(noise(2.9), 180) * 0.6 + np.sin(2 * np.pi * 120 * tvec(2.9)) * 0.05
place(hum, 0.0, 0.25, 0, 0.2)
place(pad([A2, E3, C4], 3.0, 0.6, 0.6), 0.0, 0.32, 0, 0.6)
for tt in np.arange(0.1, 2.9, 0.5):
    place(tick(), tt, 0.12, 0.3)
    place(kick(0.3, 80, 40), tt, 0.25)
place(impact(0.9, 50), 1.20, 0.45, 0, 0.3)
place(stab([A3, C4, E4], 0.25), 1.20, 0.2, 0, 0.3)
place(pluck(E5, 0.5), 1.6, 0.18, -0.3, 0.6)
place(pluck(B3 * 2, 0.6), 1.9, 0.22, 0.3, 0.6)

# ── 2.95–6.4 · whip pan, LAZY lands, the crowd ──
place(whoosh(0.5, 500, 12000), 2.8, 0.6, 0.6)
place(impact(0.8, 60), 3.45, 0.4, -0.3, 0.3)
place(clank(1.0), 3.55, 0.38, -0.2, 0.5)
place(blip(1300, 0.08, 40), 3.75, 0.12, -0.3, 0.5)
murmur = sum(lowpass(noise(2.9), 600 + 150 * i) * (0.6 + 0.4 * np.sin(2 * np.pi * (3 + i) * tvec(2.9) + i)) for i in range(4))
place(murmur * np.minimum(1, tvec(2.9) / 0.4) * np.minimum(1, (2.9 - tvec(2.9)) / 0.5), 3.3, 0.18, 0, 0.5)
place(pad([F2, C3, A3], 3.4, 0.5, 0.6), 3.0, 0.3, 0, 0.6)
for tt in np.arange(3.0, 6.4, 0.5):
    place(kick(0.3, 90, 42), tt, 0.3)
    place(hat(0.04), tt + 0.25, 0.06, 0.3)

# ── 6.4–7.85 · BUT: the brain drops, LAZY dissolves ──
place(riser(0.45, 300, 9000), 6.05, 0.4)
place(impact(1.6, 38), 6.55, 0.8, 0, 0.5)
place(clank(1.2), 6.62, 0.35, 0.3, 0.6)
sand = lowpass(noise(1.0), 9000) - lowpass(noise(1.0), 2500)
place(sand * np.sin(np.linspace(0, np.pi, len(sand))), 7.0, 0.35, -0.5, 0.4)
for i, tt in enumerate(np.arange(7.7, 8.3, 0.075)):
    place(blip(700 * 2 ** (i / 8), 0.06, 50), tt, 0.06, (i % 2 - 0.5) * 0.4)   # OPPOSITE flips letter by letter
place(pad([A2, E3, A3, C4], 1.5, 0.3, 0.4), 6.55, 0.4, 0, 0.7)
for tt in np.arange(6.55, 7.85, 0.5):
    place(kick(0.35, 120, 45), tt, 0.5)
    place(snare(0.25), tt + 0.25, 0.18, 0, 0.3)

# ── 7.85–12.35 · inside the brain ──
place(riser(0.55, 200, 14000), 7.85, 0.55)
place(impact(1.4, 34), 8.35, 0.7, 0, 0.7)                 # we're in
under = lowpass(noise(4.0), 500) * 0.9 + np.sin(2 * np.pi * 55 * tvec(4.0)) * 0.3
place(under * np.minimum(1, tvec(4.0) / 0.3) * np.minimum(1, (4.0 - tvec(4.0)) / 0.2), 8.35, 0.3, 0, 0.6)
r2 = np.random.default_rng(5)
for k in range(46):                                       # neurons firing
    tt = 8.4 + r2.uniform(0, 3.9)
    place(blip(float(r2.choice([1800, 2400, 3200, 4100])), 0.05, 70), tt, 0.05, r2.uniform(-0.9, 0.9), 0.6)
for tt in np.arange(8.35, 11.25, 0.5):
    place(kick(0.4, 110, 40), tt, 0.4)
place(pluck(G4, 0.5), 9.7, 0.18, -0.4, 0.6)               # the TIME cluster lights up
tt, gap = 9.75, 0.2
while tt < 10.55:
    place(tick(), tt, 0.14, -0.4); tt += gap; gap = max(0.04, gap * 0.82)
glass = noise(0.6) - lowpass(noise(0.6), 4000)
place(glass * np.exp(-tvec(0.6) * 8), 10.6, 0.55, -0.3, 0.4)
place(impact(1.0, 44), 10.6, 0.5, 0, 0.4)
place(whoosh(0.2, 1500, 12000), 10.7, 0.28, -0.4); place(whoosh(0.2, 1500, 12000), 10.85, 0.28, 0.4)
hb = 0.6
tt = 11.25
while tt < 12.35:                                          # heartbeat speeds up as fear spreads
    place(kick(0.25, 70, 38), tt, 0.7); place(kick(0.2, 70, 38), tt + 0.16, 0.45)
    tt += hb; hb = max(0.3, hb * 0.82)
place(stab([A2 * 2, C3 * 2, 155.6 * 2], 0.6), 11.65, 0.25, 0, 0.5)
place(riser(0.9, 120, 6000), 11.45, 0.35)
place(whoosh(0.45, 8000, 200), 12.3, 0.5)                 # sucked into the fear centre

# ── 12.8–15.35 · back at the desk: the shadow becomes the fear ──
place(whoosh(0.4, 200, 6000), 12.75, 0.4)
buzz = np.sign(np.sin(2 * np.pi * 100 * tvec(1.8))) * 0.15 * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * tvec(1.8)))
place(lowpass(buzz, 2000), 12.8, 0.2, 0.4, 0.2)           # the lamp flickers
place(growl(1.25), 13.4, 0.6, 0, 0.4)
place(riser(1.2, 120, 3000), 13.4, 0.35)
place(impact(2.0, 30), 14.62, 1.0, 0, 0.6)
place(growl(0.9) * np.exp(-tvec(0.9) * 2.5), 14.62, 0.75, 0, 0.5)
place(stab([A2 * 2, C3 * 2, 155.6 * 2], 0.5), 14.62, 0.3, 0, 0.4)

# ── 15.35–18 · start small ──
place(pad([F3, A3, C4, E4], 2.65, 0.4, 1.2), 15.2, 0.45, 0, 0.8)
place(piano(C5, 1.8), 15.55, 0.3, -0.2, 0.8)
place(piano(E5, 1.8), 15.95, 0.3, 0.2, 0.8)
boop = np.sin(2 * np.pi * np.cumsum(np.geomspace(900, 300, int(0.25 * SR))) / SR) * np.exp(-tvec(0.25) * 6)
place(boop, 16.4, 0.25, 0, 0.5)                             # SMALL shrinks
place(whoosh(0.4, 1200, 9000), 16.15, 0.25, -0.3)
place(piano(G5, 1.5), 16.6, 0.22, 0, 0.8)
place(pluck(C5 * 2, 0.6), 16.75, 0.15, 0, 0.8)
place(piano(C4, 1.6), 17.0, 0.2, 0, 0.8)

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
