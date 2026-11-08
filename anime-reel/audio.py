"""Synthesized 15s score for the anime reel. Writes a full mix and an SFX-only stem
(so a licensed song can be added in Instagram).

usage: python3 audio.py full.wav sfx.wav

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



music = (np.zeros((N, 2)), np.zeros((N, 2)))
sfx = (np.zeros((N, 2)), np.zeros((N, 2)))


def use(bus):
    global dry, wet
    dry, wet = bus


def b808(f, d=1.2, g=1.0):
    t = tvec(d)
    fr = f * (1 + np.exp(-t * 30))
    s = np.tanh(np.sin(2 * np.pi * np.cumsum(fr) / SR) * 2.2) * np.exp(-t * 1.3) * np.minimum(1, t * 400)
    return s * g


def zap(d=0.25):
    t = tvec(d)
    n = noise(d)
    n = n - lowpass(n, 3000)
    tone = np.sin(2 * np.pi * np.cumsum(2000 + 1500 * rng.uniform(-1, 1, len(t))) / SR)
    return (n * 0.8 + tone * 0.3) * np.exp(-t * 14) * (rng.uniform(0, 1, len(t)) > 0.3)


def roar(d):
    t = tvec(d)
    n = lowpass(noise(d), 900) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t))
    rum = np.sin(2 * np.pi * 42 * t) * 0.6
    return (n * 2.2 + rum) * np.minimum(1, t / 0.15) * np.minimum(1, (d - t) / 0.2)


Dm, Bb, F, A = [D3, F3, A2 * 2], [Bb2, D3, F3], [F2 * 2, A2 * 2, C3 * 2], [A2, 138.6, 164.8]
D1 = 36.7

# ═════ MUSIC ═════
use(music)
place(pad([D3, F3, A2 * 2], 2.7, 1.0, 0.5), 0.0, 0.4, 0, 0.7)
for i, (tt, f) in enumerate(zip([0.3, 0.46, 0.62, 0.95, 1.11], [A4, F4, D4, A4, D5])):
    place(piano(f, 2.0), tt, 0.2, (i % 2 - 0.5) * 0.5, 0.8)
# struggle: half-time trap at 120 BPM
chs = [Dm, Bb, F, A]
roots = [D2, Bb1, F2, A2 / 2]
for i, c in enumerate([2.5, 4.0, 5.5, 7.0]):
    chord(chs[i], c, 0.26, 1.6)
    place(b808(roots[i], 0.7), c, 0.55)
    place(b808(roots[i], 0.6), c + 0.75, 0.45)
    place(snare(0.3), c + 0.5, 0.42, 0, 0.3)
    place(snare(0.3), c + 1.25, 0.42, 0, 0.3)
    for k, tt in enumerate(np.arange(c, c + 1.5, 0.125)):
        place(hat(), tt, 0.16 if k % 2 else 0.09, 0.35)
    for tt in np.arange(c + 1.25, c + 1.5, 0.0417):  # hat roll
        place(hat(0.03), tt, 0.08, -0.3)
# give up?: drone
place(pad([D2 * 2, 77.8 * 2], 1.8, 0.3, 0.8), 8.5, 0.35, 0, 0.6)
place(sub(D1 * 2, 1.7, 0.8), 8.5, 0.5)
# power: double-time trap
place(b808(D1, 2.5), 10.25, 0.9)
place(brass([D3, A2 * 2, D4], 2.5, 0.08), 10.25, 0.45, 0, 0.4)
for tt in (10.25, 10.75, 11.0, 11.5, 12.0, 12.25, 12.5):
    place(kick(0.4, 180, 45), tt, 0.95)
for tt in np.arange(10.5, 12.75, 0.5):
    place(snare(0.35), tt, 0.5, 0, 0.3)
for k, tt in enumerate(np.arange(10.25, 12.75, 0.0625)):
    place(hat(), tt, 0.12 if k % 2 else 0.07, 0.3)
place(b808(Bb1, 1.0), 11.25, 0.8)
place(b808(D1 * 1.5, 0.8), 12.0, 0.8)
# final
place(brass([D3, 185.0, A2 * 2, D4], 2.2, 0.05), 12.75, 0.55, 0, 0.6)
chord([D4, 370.0, A4, D5], 12.75, 0.25, 2.2, 0.01)
place(b808(D1, 2.2), 12.75, 0.9)
for tt in np.arange(12.75, 14.4, 0.5):
    place(kick(0.4, 160, 42), tt, 0.7)
    place(snare(0.35), tt + 0.25, 0.3, 0, 0.5)

# ═════ SFX ═════
use(sfx)
place(lowpass(noise(2.5), 3500), 0.0, 0.3, 0, 0.1)            # rain on the eye
place(whoosh(0.6, 200, 4000, rev=True), 1.95, 0.4)
for c in [2.5, 4.0, 5.5, 7.0, 8.5]:
    place(impact(1.0, 40), c, 0.5, 0, 0.3)
    place(whoosh(0.3, 600, 9000), c - 0.12, 0.35)
for c in [3.25, 4.75, 6.25, 7.75]:                          # punch-ins
    place(kick(0.25, 260, 90), c, 0.4)
    place(whoosh(0.2, 1500, 9000), c - 0.08, 0.25)
place(lowpass(noise(1.5), 3000), 2.5, 0.3)                  # alley rain
place(whoosh(1.4, 150, 1500), 5.5, 0.35, 0.3, 0.2)          # wind
place(lowpass(noise(0.75), 3500), 8.5, 0.45)                # storm
for tt in (8.6, 8.9, 9.1):
    place(zap(0.3), tt, 0.25, 0.4, 0.5)                     # thunder crackle
place(impact(1.8, 30), 8.5, 0.5, 0, 0.7)
place(impact(0.6, 55), 9.25, 0.7)                           # shock
place(blip(3200, 0.5, 4), 9.25, 0.12, 0, 0.3)               # ringing
for tt in (9.8, 10.0):
    place(kick(0.4, 90, 40), tt, 0.95)                       # heartbeat
place(riser(0.5, 300, 14000), 9.75, 0.6)
place(impact(2.5, 28), 10.25, 1.0, 0, 0.8)                  # ignition
place(roar(2.5), 10.25, 0.5, 0, 0.3)
for tt in np.arange(10.8, 12.7, 0.17):
    place(zap(0.2), tt + rng.uniform(0, 0.08), 0.18, rng.uniform(-0.8, 0.8), 0.4)
for tt in (11.25, 12.0):                                     # impact frames
    place(whoosh(0.25, 800, 12000, rev=True), tt - 0.25, 0.45)
    place(impact(1.0, 34), tt, 0.85, 0, 0.5)
place(riser(0.5, 300, 14000), 12.25, 0.5)
place(impact(2.2, 30), 12.75, 0.9, 0, 0.8)
crowd = lowpass(noise(2.25) + 0.5 * noise(2.25), 1800) * np.minimum(1, tvec(2.25) / 0.3)
place(crowd, 12.75, 0.4, 0, 0.6)
for i in range(4):
    place(blip(1500 + i * 250, 0.08, 40), 12.85 + i * 0.14, 0.08, (i - 1.5) * 0.3, 0.6)


def render(bus):
    d, w = bus
    ir_t = tvec(1.6)
    ir = rng.normal(0, 1, (len(ir_t), 2)) * np.exp(-ir_t * 3.2)[:, None]
    ir[:, 0] = lowpass(ir[:, 0], 6000); ir[:, 1] = lowpass(ir[:, 1], 6000)
    nfft = 1 << int(np.ceil(np.log2(N + len(ir_t))))
    rev = np.stack([np.fft.irfft(np.fft.rfft(w[:, c], nfft) * np.fft.rfft(ir[:, c], nfft), nfft)[:N] for c in range(2)], 1)
    rev *= 0.25 / (np.abs(rev).max() + 1e-9) * np.abs(w).max()
    return d + rev * 1.6


def write(path, mix):
    mix = np.tanh(mix / np.abs(mix).max() * 1.5)
    fade = np.minimum(1, (DUR - np.arange(N) / SR) / 0.3)[:, None]
    mix = mix * fade * 0.89 / np.abs(mix).max()
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
        wf.writeframes((mix * 32767).astype('<i2').tobytes())


m, s = render(music), render(sfx)
write(sys.argv[1] if len(sys.argv) > 1 else 'full.wav', m + s * 0.9)
write(sys.argv[2] if len(sys.argv) > 2 else 'sfx.wav', s)
print('ok')
