"""Synthesized 14s score for the "grow" reel: sombre build, heartbeat, triumphant payoff.

usage: python3 audio.py out.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 14.0
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


D2, F2, A2, Bb1, Bb2, D3, F3, Bb3, C3, D4, F4, A4, D5, F5, A5, C5 = 73.4, 87.3, 110, 58.3, 116.5, 146.8, 174.6, 233.1, 130.8, 293.7, 349.2, 440, 587.3, 698.5, 880, 523.3


def piano(f, d=2.5, g=1.0):
    t = tvec(d)
    s = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t * (1.6 + 1.3 * k)) / k ** 1.3 for k in range(1, 8))
    return s * np.minimum(1, t * 600) * g


def chord(fs, t0, g=0.35, d=2.6, spread=0.018):
    for i, f in enumerate(fs):
        place(piano(f, d), t0 + i * spread, g, (i / max(1, len(fs) - 1) - 0.5) * 0.6, 0.7)


def brass(fs, d, attack=0.25):
    t = tvec(d)
    s = np.zeros_like(t)
    for f in fs:
        for det in (-0.08, 0.0, 0.09):
            ff = f * 2 ** (det / 12)
            s += 2 * (ff * t % 1) - 1
    s /= len(fs) * 3
    s = lowpass(s, np.minimum(4500, 400 + 4000 * np.minimum(1, t / attack)))
    return s * np.minimum(1, t / attack) * np.minimum(1, (d - t) / 0.5)


# ── 0–3.2 · hook ──
place(pad([D3, F3, A2 * 2], 3.4, 1.2, 0.6), 0.0, 0.45, 0, 0.7)
for i, (tt, f) in enumerate(zip([0.35, 0.52, 0.69, 0.86, 1.03, 1.2], [A4, F4, D4, A4, C5, D5])):
    place(piano(f, 2.0), tt, 0.22, (i % 2 - 0.5) * 0.5, 0.8)
place(whoosh(1.2, 200, 3000, rev=True), 2.0, 0.35)

# ── 3.2–8.8 · four shots ──
cuts = [3.2, 4.6, 6.0, 7.4]
chs = [[D2, D3, F3, A2 * 2], [Bb1, Bb2, D3, F3], [F2, F3, A2 * 2, C3 * 2], [C3 / 2, C3, F3 * 0.917 * 1.0, C3 * 1.5]]
melody = [A4, F4, C5, A4 * 0.891]
for c, ch, m in zip(cuts, chs, melody):
    place(impact(1.4, 36), c, 0.55, 0, 0.4)
    chord(ch, c, 0.32)
    place(piano(m, 1.6), c + 0.02, 0.2, 0.3, 0.8)
    place(sub(ch[0], 1.4, 1.8), c, 0.5)
    place(piano(m * 0.75, 1.0), c + 0.7, 0.12, -0.3, 0.8)
# ambience per shot
rain = lowpass(noise(1.4), 3500) * 0.8
place(rain, 3.2, 0.35, 0, 0.1)
for k in range(10):
    place(hat(0.03), 3.25 + k * 0.13, 0.05, (k % 3 - 1) * 0.7)
place(lowpass(noise(1.4), 400), 4.6, 0.2)
for k in range(3):
    place(blip(2600, 0.02, 200), 4.75 + k * 0.45, 0.08, 0.5)  # clock tick
place(whoosh(1.4, 150, 1500), 6.0, 0.45, 0.3, 0.2)
creak = np.sin(2 * np.pi * np.cumsum(np.linspace(700, 1050, int(0.35 * SR)) + 40 * np.sin(np.linspace(0, 60, int(0.35 * SR)))) / SR) * np.sin(np.linspace(0, np.pi, int(0.35 * SR)))
place(creak, 7.95, 0.06, 0.2, 0.6)
place(creak[::-1], 8.45, 0.05, 0.2, 0.6)
for k in range(12):
    place(blip(4200 + (k % 2) * 300, 0.04, 80), 7.45 + k * 0.11, 0.03, 0.8 * (k % 2 * 2 - 1), 0.4)  # crickets

# ── 8.8–9.3 · breath + heartbeat ──
place(whoosh(1.0, 300, 9000, rev=True), 8.3, 0.55)
place(riser(0.9, 200, 8000), 8.4, 0.45)
for tt in (8.85, 9.05):
    place(kick(0.4, 90, 40), tt, 0.9)

# ── 9.3–14 · payoff ──
place(impact(3.0, 30), 9.3, 1.0, 0, 0.8)
place(kick(0.9, 170, 36), 9.3, 1.0)
prog = [(9.3, [D3, F3 * 1.0595, A2 * 2, D4], D2), (10.5, [Bb2, D3, F3, Bb3], Bb1), (11.7, [C3, E3 := 164.8, G3 := 196.0, C3 * 2], C3 / 2), (12.9, [D3, F3 * 1.0595, A2 * 2, D4], D2)]
for t0, fs, root in prog:
    d = 14.0 - t0 if t0 == 12.9 else 1.3
    place(brass(fs, d + 0.1), t0, 0.5, 0, 0.5)
    chord([f * 2 for f in fs], t0, 0.18, 2.0, 0.01)
    place(sub(root, d, 1.0), t0, 0.5)
for tt in np.arange(9.3, 13.8, 0.6):
    place(kick(0.5, 140, 45), tt, 0.85)
    place(snare(0.4), tt + 0.3, 0.35, 0, 0.5)
for tt in np.arange(9.3, 13.8, 0.15):
    place(hat(0.05), tt, 0.1, 0.4)
crowd = lowpass(noise(4.7) + 0.5 * noise(4.7), 1800)
crowd *= np.minimum(1, tvec(4.7) / 0.4) * np.minimum(1, (4.7 - tvec(4.7)) / 1.5)
place(crowd, 9.3, 0.4, 0, 0.6)
for i, f in enumerate([D5, F5 * 1.0595, A5, D5 * 2]):  # word pops
    place(piano(f, 1.2), 9.45 + i * 0.28, 0.14, (i - 1.5) * 0.3, 0.8)

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
