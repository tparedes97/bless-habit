"""Pista lo-fi tranquila para los videos de Bless (sintetizada, libre de derechos).

Uso: python3 scripts/make-music.py  ->  public/music/lofi-calm.wav
Fmaj7 - Em7 - Dm7 - Cmaj7 a 84 BPM: piano eléctrico, bajo, batería suave,
melodía pentatónica y crujido de vinilo.
"""
import os
import wave
import numpy as np

SR = 48000
BPM = 84
BEAT = 60 / BPM
BAR = BEAT * 4
BARS = 12
DUR = BARS * BAR + 3.0  # cola para la reverb
N = int(DUR * SR)
rng = np.random.default_rng(7)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf, sig, t):
    i = int(t * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):  # un polo; corto y suficiente
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def fft_convolve(x, ir):
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:n]
    return y[: len(x)]


def reverb_ir(seconds=1.8, seed=1):
    r = np.random.default_rng(seed)
    t = np.arange(int(seconds * SR)) / SR
    ir = r.standard_normal(len(t)) * np.exp(-t * 3.2)
    ir = lowpass(ir, 5000)
    return ir / np.sqrt(np.sum(ir**2))


# ---- instrumentos ----
def ep_note(freq, dur, vel=1.0):
    t = np.arange(int((dur + 1.5) * SR)) / SR
    env = np.minimum(1, t / 0.008) * np.exp(-t * 1.1)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.5 * t)
    tone = np.sin(2 * np.pi * freq * t) + 0.32 * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t * 3) \
        + 0.12 * np.sin(2 * np.pi * 3.01 * freq * t) * np.exp(-t * 6)
    rel = np.where(t > dur, np.exp(-(t - dur) * 6), 1.0)
    return 0.16 * vel * tone * env * trem * rel


def bass_note(freq, dur):
    t = np.arange(int((dur + 0.3) * SR)) / SR
    env = np.minimum(1, t / 0.01) * np.exp(-t * 1.6) * np.where(t > dur, np.exp(-(t - dur) * 12), 1)
    return 0.3 * np.tanh(1.6 * np.sin(2 * np.pi * freq * t)) * env


def kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 45 + 75 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return 0.55 * np.sin(ph) * np.exp(-t * 7.5)


def snare():
    t = np.arange(int(0.3 * SR)) / SR
    noise = lowpass(rng.standard_normal(len(t)), 3500) * np.exp(-t * 16)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 22)
    return 0.22 * noise + 0.16 * body


def hat(open_=False):
    t = np.arange(int((0.18 if open_ else 0.05) * SR)) / SR
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 7000)
    return 0.05 * n * np.exp(-t * (18 if open_ else 70))


def pluck(freq, vel=1.0):
    t = np.arange(int(1.6 * SR)) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t * 2.6)
    tone = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 4 * freq * t) * np.exp(-t * 9)
    return 0.11 * vel * tone * env


# ---- arreglo ----
CHORDS = [
    (53, [57, 60, 64, 67]),  # Fmaj7 (bajo F)
    (52, [55, 59, 62, 67]),  # Em7
    (50, [53, 57, 60, 64]),  # Dm7
    (48, [52, 55, 59, 64]),  # Cmaj7
]
MELODY = [  # (compás relativo, tiempo en beats, nota midi)
    (0, 0.5, 76), (0, 1.5, 74), (0, 2.5, 72), (1, 0.5, 74), (1, 2.0, 71),
    (2, 0.5, 72), (2, 1.5, 69), (2, 3.0, 72), (3, 0.5, 71), (3, 2.0, 67),
]

keys = np.zeros(N); bass = np.zeros(N); drums = np.zeros(N); mel = np.zeros(N)
hatL = np.zeros(N); hatR = np.zeros(N)
SWING = 0.07 * BEAT

for bar in range(BARS):
    t0 = bar * BAR
    root, notes = CHORDS[bar % 4]
    # piano eléctrico: acorde en 1, repique suave en el "y" del 2
    for k, m in enumerate(notes):
        place(keys, ep_note(midi(m), BAR * 0.55, 0.9), t0 + k * 0.012)
        place(keys, ep_note(midi(m), BAR * 0.35, 0.45), t0 + 1.5 * BEAT + SWING + k * 0.01)
    if bar >= 1:
        place(bass, bass_note(midi(root - 12), BEAT * 1.7), t0)
        place(bass, bass_note(midi(root - 12 + 7), BEAT * 0.9), t0 + 2.5 * BEAT + SWING)
        place(drums, kick(), t0)
        place(drums, kick(), t0 + 2.5 * BEAT + SWING)
        if bar % 2 == 1:
            place(drums, 0.6 * kick(), t0 + 3.5 * BEAT + SWING)
        place(drums, snare(), t0 + BEAT)
        place(drums, snare(), t0 + 3 * BEAT)
        for e in range(8):
            tt = t0 + e * BEAT / 2 + (SWING if e % 2 else 0)
            h = hat(open_=(e == 7 and bar % 4 == 3))
            place(hatL if e % 2 else hatR, h, tt)
            place(hatR if e % 2 else hatL, 0.5 * h, tt)
    if bar >= 4:
        for rb, beat, m in MELODY:
            if rb == bar % 4:
                place(mel, pluck(midi(m), 0.9 if bar >= 8 else 0.7), t0 + beat * BEAT + (SWING if beat % 1 else 0))

ir = reverb_ir()
keys = lowpass(keys, 2600)
keys_wet = fft_convolve(keys, ir) * 0.35
mel_wet = fft_convolve(mel, ir) * 0.45

# crujido de vinilo
crackle = np.zeros(N)
idx = rng.integers(0, N, size=int(DUR * 9))
crackle[idx] = rng.standard_normal(len(idx)) * 0.08
crackle = lowpass(crackle, 4000) + lowpass(rng.standard_normal(N) * 0.004, 1200)

haas = int(0.012 * SR)
left = keys + keys_wet + bass + drums + hatL + mel + mel_wet * 0.9 + crackle
right = np.concatenate([np.zeros(haas), keys[:-haas]]) + keys_wet * 1.05 + bass + drums + hatR \
    + np.concatenate([np.zeros(haas), mel[:-haas]]) + mel_wet + crackle

st = np.stack([left, right], axis=1)
fade = np.ones(N)
fi, fo = int(0.4 * SR), int(3.0 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fade[-fo:] = np.linspace(1, 0, fo)
st *= fade[:, None]
st = np.tanh(st * 1.4) / np.tanh(1.4)
st *= 0.89 / np.max(np.abs(st))

out = os.path.join(os.path.dirname(__file__), "..", "public", "music", "lofi-calm.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype("<i2").tobytes())
print(f"{out}: {DUR:.1f}s")
