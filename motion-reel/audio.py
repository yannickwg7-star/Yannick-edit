"""Synthesized 15s score for the motion reel, hit-synced to the animation (120 BPM).

usage: python3 audio.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 15.0
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

# ── 0–2s · the point ──
place(blip(1760, 0.2, 18), 0.05, 0.35, 0, 0.6)
place(sub(A1, 1.2, 2.5), 0.05, 0.45)
place(blip(1320, 0.15, 25), 0.5, 0.25, -0.3, 0.6)
place(blip(1100, 0.15, 25), 1.0, 0.25, 0.3, 0.6)
place(whoosh(0.4, 400, 3000, rev=True), 0.62, 0.35)
place(whoosh(0.5, 300, 9000), 0.98, 0.6, 0, 0.3)
place(riser(0.55, 300, 10000), 1.45, 0.5, 0, 0.2)
for i, tt in enumerate([1.48, 1.55, 1.62, 1.66, 1.70, 1.78]):
    place(whoosh(0.18, 800, 7000), tt, 0.25, (-1) ** i * 0.6)

# ── 2–4s · type ──
place(impact(1.6), 2.0, 0.9, 0, 0.4)
for k, tt in enumerate([2.0, 2.25, 2.5, 2.75]):
    place(kick(0.35, 220, 70), tt, 0.7)
    place(stab([A3, C4, E4] if k < 3 else [G3, B3, D4], 0.22), tt, 0.25, 0, 0.3)
for tt in np.arange(3.0, 3.55, 0.5):
    place(kick(), tt, 0.85)
for tt in np.arange(2.0, 3.55, 0.25):
    place(hat(), tt + 0.125, 0.25, 0.4)
for k, tt in enumerate(np.arange(3.55, 3.95, 1 / 32 * 2)):
    place(blip(2400 - k * 180, 0.05, 60), tt, 0.25, (-1) ** k * 0.5)
    place(hat(0.04), tt, 0.3, -(-1) ** k * 0.5)
place(whoosh(0.45, 600, 12000), 3.55, 0.6)

# ── 4–6.5s · rhythm ──
place(impact(1.2, 45), 4.0, 0.6, 0, 0.3)
bass = [A1, A1, C3 / 2, A1, E3 / 2, A1, G3 / 2, A1, A1, C3 / 2]
for k, tt in enumerate(np.arange(4.0, 6.0, 0.5)):
    place(kick(), tt, 0.95)
    place(sub(bass[k * 2 % len(bass)], 0.22, 9), tt + 0.25, 0.55)
for k, tt in enumerate(np.arange(4.0, 6.0, 0.125)):
    place(hat(), tt, 0.32 if k % 2 else 0.14, 0.35)
for tt in (4.5, 5.5):
    place(snare(), tt, 0.5, 0, 0.25)
for k in range(10):
    place(blip(600 * 2 ** (k / 6), 0.08, 50), 4.0 + k * 0.045, 0.18, (k % 3 - 1) * 0.6, 0.5)
for k in range(8):
    place(blip(2000 * 2 ** (-k / 5), 0.06, 60), 6.0 + k * 0.03, 0.15, (k % 3 - 1) * 0.6)
place(riser(0.5), 6.0, 0.45)

# ── 6.5–9s · easing ──
place(impact(1.4, 42), 6.5, 0.6, 0, 0.35)
for tt in (6.5, 7.25, 7.5, 8.0, 8.5):
    place(kick(), tt, 0.75)
for tt in (7.0, 8.0):
    place(snare(), tt, 0.45, 0, 0.3)
for tt in np.arange(6.5, 8.75, 0.25):
    place(hat(), tt + 0.125, 0.18, -0.35)
place(whoosh(0.35, 500, 6000), 6.82, 0.35, 0.4)
place(whoosh(0.35, 500, 6000), 7.92, 0.35, -0.4)
for k, f in enumerate([A3, C4, E4, A4]):
    place(pluck(f), 7.75 + k * 0.012, 0.32, (k - 1.5) * 0.4, 0.5)
for k, f in enumerate([G3, B3, D4, G4]):
    place(pluck(f), 8.75 + k * 0.012, 0.3, (k - 1.5) * 0.4, 0.5)
for k in range(5):  # elastic wobble pings
    place(blip(E5 * (1 - k * 0.04), 0.08, 40), 6.95 + k * 0.1, 0.12 * (1 - k / 5), 0.6, 0.6)
place(riser(0.3, 400, 12000), 8.7, 0.5)

# ── 9–11.5s · space ──
place(impact(2.5, 34), 9.0, 0.85, 0, 0.6)
place(pad([A2, E3, B3, C4], 2.6, 0.3, 0.6), 9.0, 0.55, 0, 0.7)
for tt in (9.0, 10.0, 11.0):
    place(kick(0.6, 120, 38), tt, 0.7)
for tt in (9.5, 10.5):
    place(snare(0.5), tt, 0.3, 0, 0.6)
r2 = np.random.default_rng(11)
for k in range(26):
    tt = 9.1 + k * 0.09 + r2.uniform(0, 0.05)
    place(blip(float(r2.choice([E5, A4 * 2, B3 * 4, C5 * 2])), 0.1, 45), tt, 0.07, r2.uniform(-0.9, 0.9), 0.8)
place(whoosh(0.6, 200, 4000), 9.8, 0.4, -0.3, 0.3)
place(whoosh(0.6, 200, 4000), 10.45, 0.4, 0.3, 0.3)
place(riser(0.4, 300, 14000), 11.1, 0.7)

# ── 11.5–13.5s · energy ──
chords = [[A3, C4, E4], [C4, E4, G4], [D4, G4, A4 * 1.0], [E4, G4, B3 * 2]]
for k, tt in enumerate([11.5, 11.75, 12.0, 12.25]):
    place(kick(0.4, 200, 50), tt, 1.0)
    place(stab(chords[k], 0.24), tt, 0.4, 0, 0.3)
    place(hat(0.15, True), tt, 0.25, 0.3)
place(impact(0.9, 48), 11.5, 0.5)
for tt in np.arange(12.5, 13.2, 0.25):
    place(kick(), tt, 0.95)
    place(sub(A1, 0.2, 10), tt + 0.125, 0.5)
for k, tt in enumerate(np.arange(12.5, 13.2, 0.0625)):
    place(hat(), tt, 0.28 if k % 2 else 0.14, 0.3)
roll = list(np.arange(12.95, 13.25, 0.0625)) + list(np.arange(13.25, 13.5, 0.03125))
for k, tt in enumerate(roll):
    place(snare(0.12), tt, 0.15 + 0.35 * k / len(roll), 0, 0.2)
place(riser(0.7, 200, 15000), 12.8, 0.6)
place(whoosh(0.35, 400, 12000), 13.17, 0.5)

# ── 13.5–15s · resolve ──
place(impact(1.5, 30), 13.5, 1.0, 0, 0.7)
place(kick(0.8, 180, 36), 13.5, 1.0)
place(pad([A2, E3, A3, C4 * 1.0, E4, B3 * 2], 1.5, 0.05, 1.2), 13.5, 0.6, 0, 0.8)
for k in range(6):  # letters rising
    place(blip(880 * 2 ** (k / 12 * 2), 0.07, 50), 13.62 + k * 0.045, 0.1, (k - 2.5) * 0.25, 0.5)
for tt, g in ((14.127, 0.5), (14.255, 0.25), (14.318, 0.12)):  # dot bounce
    place(pluck(A4 * 2, 0.5), tt, g, 0.1, 0.6)
    place(kick(0.2, 300, 120), tt, g * 0.6)
SUB = 'DESIGNED & ANIMATED ENTIRELY IN CODE'
for k in range(1, len(SUB) + 1):
    if SUB[k - 1] != ' ':
        place(hat(0.02), 14.25 + 0.4 * k / len(SUB), 0.07, r2.uniform(-0.4, 0.4))
place(pluck(E5, 0.8), 14.62, 0.15, 0, 0.8)

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
