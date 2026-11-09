"""Sound-design layer (SFX only) for REBORN, synced to the animation. Mixed under the speech.

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


SCENES = [3.6, 5.3, 9.4, 14.75, 19.45, 22.35, 25.85, 30.7, 35.5, 40.7]
DROPS = [6.95, 17.40, 24.00, 28.45, 33.40, 37.50, 41.30]
place(impact(1.4, 40), 0.05, 0.7, 0, 0.5); place(blip(2200, 0.3, 10), 0.05, 0.15, 0, 0.6)       # hook snap
for s0 in SCENES:
    place(whoosh(0.42, 300, 10000), s0 - 0.38, 0.45, 0.3 if s0 % 2 > 1 else -0.3, 0.3)
for d0 in DROPS:
    place(riser(1.3, 200, 12000), d0 - 1.3, 0.35)
    place(whoosh(0.5, 9000, 300, rev=True), d0 - 0.5, 0.3)
    place(impact(2.2, 32), d0, 0.95, 0, 0.6)
    place(sub(41, 1.4, 2.2), d0, 0.6)
r = np.random.default_rng(3)
for k in range(26):                                    # the photo burning
    place(lowpass(noise(0.05), 6000) * np.exp(-tvec(0.05) * 60), 2.0 + r.uniform(0, 1.4), 0.12, r.uniform(-0.6, 0.6))
for i in range(10):                                    # embers forming the trophy
    place(blip(800 * 2 ** (i / 7), 0.12, 30), 3.6 + i * 0.035, 0.07, (i % 2 - 0.5) * 0.6, 0.6)
place(pluck(880, 0.8), 3.85, 0.18, 0, 0.6)
tt, gap = 5.35, 0.24                                   # clock ticking faster and faster
while tt < 6.9:
    place(tick(), tt, 0.16, 0.2); tt += gap; gap = max(0.05, gap * 0.86)
place(glass(1.0), 6.95, 0.5, 0, 0.5)
for k in [9.9, 10.3, 10.7, 11.25, 11.65, 12.05]:
    place(knock(), k, 0.6, -0.25, 0.4)
place(clank(), 12.7, 0.3, 0.2, 0.5)                    # the lock stays shut
for i in range(10):
    place(blip(1200 + i * 90, 0.04, 90) + hat(0.04) * 0.5, 17.45 + i * 0.09, 0.09, (i % 3 - 1) * 0.5, 0.4)   # puzzle pieces
place(whoosh(0.35, 800, 9000), 19.1, 0.35, 0.4)        # mirror flips
for i in range(8):
    place(hat(0.03), 21.1 + i * 0.03, 0.12, (i % 2 - 0.5) * 0.8)   # the plan breaks (glitch)
place(impact(0.6, 70), 21.15, 0.3, 0.2, 0.3)
for tt in np.arange(22.45, 24.0, 0.11):
    place(tick(), tt, 0.07, -0.3)                      # gears
place(clank(), 24.0, 0.45, 0, 0.5)
place(hum(1.45, 60, 240), 27.0, 0.22, 0, 0.3)          # the core charging
place(lowpass(noise(2.1), 220) * np.minimum(1, tvec(2.1) / 2.1) ** 1.2, 31.3, 0.55, 0, 0.3)   # vortex rumble
place(whoosh(1.2, 9000, 150), 32.2, 0.4)              # being devoured
place(glass(1.2), 37.5, 0.5, 0, 0.5)
for c0 in [41.3, 43.6, 44.3, 44.9]:
    place(glass(0.6)[::-1], c0 - 0.1, 0.25, 0, 0.5)   # shards rushing back
place(sub(36, 0.6, 4), 45.3, 0.6)                      # collapse to the dot
place(blip(1800, 0.25, 14), 45.45, 0.12, 0, 0.7)

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
