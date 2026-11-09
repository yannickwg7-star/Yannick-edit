"""Film-cut sound design for REBORN: quiet, three big moments. Mixed under the speech.

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



T_REBORN, T_BECOME, T_DESTROY, T_AGAIN, T_LIGHT2 = 7.595, 29.26, 38.31, 41.85, 34.57
tone = lowpass(noise(45.7), 260) * 0.35 + lowpass(noise(45.7), 3000) * 0.03          # room tone / film gate
place(tone, 0.0, 0.25, 0, 0.0)
for hb in (5.6, 6.3, 6.9):                                                                  # heartbeat before reborn
    place(kick(0.35, 70, 36), hb, 0.55); place(kick(0.3, 70, 36), hb + 0.18, 0.35)
for b in (T_REBORN, T_BECOME, T_AGAIN):                                                     # the three moments
    place(riser(1.6, 120, 7000), b - 1.6, 0.35)
    place(impact(2.8, 30), b, 0.95, 0, 0.8); place(sub(38, 2.2, 1.4), b, 0.6)
place(pad([110, 164.8, 220], 6.0, 0.3, 2.5), T_REBORN, 0.18, 0, 0.8)
for k in (9.9, 10.3, 10.7, 11.25, 11.65, 12.05): place(knock(), k, 0.42, 0.15, 0.5)
place(pluck(392, 1.2), 18.0, 0.14, 0, 0.8)                                                  # the ring closes
place(pluck(523.3, 1.2), 24.1, 0.16, 0, 0.8)                                                # fix you
place(pad([130.8, 196, 261.6, 329.6], 6.0, 1.0, 2.5), T_BECOME, 0.3, 0, 0.9)               # the light
place(lowpass(noise(2.1), 200) * np.minimum(1, tvec(2.1) / 2.1) ** 1.5, 31.5, 0.45, 0, 0.3)   # devour
place(whoosh(1.2, 300, 8000), T_LIGHT2 - 0.1, 0.3, 0, 0.5)
crack = noise(0.35) - lowpass(noise(0.35), 3000)
place(crack * np.exp(-tvec(0.35) * 14), T_DESTROY - 0.3, 0.35, 0, 0.4)
place(glass(1.4), T_DESTROY, 0.32, 0, 0.8)
place(whoosh(0.3, 9000, 300, rev=True), 41.6, 0.3, 0, 0.5)
place(pad([130.8, 196, 261.6, 329.6, 392], 3.6, 0.05, 2.5), T_AGAIN, 0.38, 0, 0.9)
for tt, g in ((42.33, 0.35), (42.48, 0.16), (42.55, 0.08)): place(pluck(784, 0.5), tt, g, 0, 0.6)   # dot lands
for c0 in (43.6, 44.4, 45.05): place(pluck(523.3, 0.6), c0, 0.1, 0, 0.8)
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
