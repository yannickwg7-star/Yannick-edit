"""Synthesized 16s score for "1% better every day", synced to the animation beats.

usage: python3 audio.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 16.0
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


C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, G5, A3, F3, G3, C3 = 261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3, 587.3, 659.3, 784.0, 220.0, 174.6, 196.0, 130.8


def piano(f, d=2.0):
    t = tvec(d)
    s = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t * (1.8 + 1.4 * k)) / k ** 1.3 for k in range(1, 7))
    return s * np.minimum(1, t * 700)


def tick(f=3000):
    return blip(f, 0.03, 120)


# ── 0–6.4 · calm: the first cube, slow days ──
place(pluck(C5, 0.6), 0.2, 0.35, 0, 0.6)                 # the cube pops
place(pad([C3, G3, E4], 6.6, 1.2, 1.5), 0.0, 0.35, 0, 0.7)
arp = [C4, E4, G4, C5, G4, E4]
for k, tt in enumerate(np.arange(0.3, 6.4, 0.5)):
    place(piano(arp[k % len(arp)], 1.6), tt, 0.16, (k % 2 - 0.5) * 0.5, 0.6)
for tt, f in ((1.18, E5), (1.7, D5)):
    place(pluck(f, 0.5), tt, 0.2, 0.2, 0.5)                # "1%" / "better"
for k in range(4):
    place(pluck(G4 * 2 ** (k / 12), 0.3), 2.6 + k * 0.95, 0.18, 0.3, 0.4)   # slow steps
for tt in np.arange(2.7, 6.3, 0.12):
    place(tick(2600), tt, 0.04, -0.4)                     # day counter ticking
place(lowpass(noise(0.6), 900), 3.0, 0.12, -0.5)          # "nobody will notice" murmur

# ── 6.4–8.6 · the year: steps fly in, ticks accelerate, riser ──
place(pad([F3, C4, A4], 2.4, 0.4, 0.4), 6.4, 0.3, 0, 0.6)
tt = 6.4
k = 0
while tt < 8.3:
    place(tick(2800 + k * 25), tt, 0.06, (k % 2 - 0.5) * 0.6)
    place(blip(500 * 2 ** (k / 14), 0.06, 60), tt, 0.05, 0.2)
    tt += max(0.035, 0.16 * (1 - (tt - 6.4) / 2.2))
    k += 1
place(riser(2.0, 200, 12000), 6.6, 0.55)
place(whoosh(0.6, 400, 9000), 8.1, 0.35)

# ── 8.6–12.6 · the curve: pulse + rising glide, the 37x hit ──
for tt in np.arange(8.6, 12.6, 0.5):
    place(kick(0.4, 150, 45), tt, 0.55)
for tt in np.arange(8.85, 12.6, 0.5):
    place(hat(0.05), tt, 0.12, 0.3)
gl = tvec(1.9)
glide = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (gl / 1.9 * 2.5)) / SR) * np.minimum(1, gl / 0.3) * 0.5
place(glide, 8.7, 0.18, 0.1, 0.5)                          # the marker riding up the curve
place(impact(2.6, 32), 10.6, 1.0, 0, 0.7)                   # 37x
place(pad([C4, E4, G4, C5], 2.2, 0.05, 1.2), 10.6, 0.55, 0, 0.8)
for i, f in enumerate([C5, E5, G5, C5 * 2]):
    place(pluck(f, 0.7), 10.62 + i * 0.06, 0.18, (i - 1.5) * 0.4, 0.7)
place(stab([C4, E4, G4], 0.3), 9.2, 0.2, 0, 0.3)           # "1%"

# ── 12.6–16 · the mountain: warm resolve, then dive back to the start ──
place(pad([F3, A3 * 2, C4, E4], 2.9, 0.6, 1.0), 12.6, 0.45, 0, 0.8)
for i, (tt, f) in enumerate(((12.8, E5), (13.15, D5), (13.9, C5), (14.25, G5))):
    place(piano(f, 1.8), tt, 0.24, (i % 2 - 0.5) * 0.4, 0.8)
place(blip(1800, 0.3, 12), 13.3, 0.08, 0.3, 0.8)            # flag
place(whoosh(0.65, 300, 10000, rev=True), 15.35, 0.5)       # the dive

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
fade = np.minimum(1, (DUR - np.arange(N) / SR) / 0.05)[:, None]
mix = mix * fade * 0.89 / np.abs(mix).max()
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'reel.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('ok')
