#!/usr/bin/env bash
# Genera los efectos de sonido del video (sintetizados, sin licencias de terceros).
# Uso: bash scripts/make-sfx.sh
set -euo pipefail
cd "$(dirname "$0")/../public"
mkdir -p sfx
R=48000
ff() { ffmpeg -y -loglevel error "$@"; }

# Whoosh suave: ruido rosa filtrado, con envolvente y paneo de izquierda a derecha
whoosh() { # nombre duración frecuencia
  local d=$2
  ff -f lavfi -i "anoisesrc=color=pink:r=$R:d=$d:a=0.6" \
    -af "bandpass=f=$3:width_type=o:w=2.2,lowpass=f=4500,volume='pow(sin(PI*t/$d),2.5)':eval=frame,aeval='val(0)*(0.35+0.65*t/$d)|val(0)*(1-0.65*t/$d)':c=stereo,aecho=0.8:0.5:45|90:0.25|0.15,volume=2.2" \
    "sfx/$1.wav"
}
whoosh whoosh-soft 0.9 700
whoosh whoosh-airy 1.1 1400
whoosh whoosh-low 1.0 420

# Nota tipo marimba (para marcar hábitos)
note() { # nombre frecuencia
  ff -f lavfi -i "aevalsrc='min(1,t*400)*(0.55*sin(2*PI*$2*t)*exp(-7*t)+0.18*sin(2*PI*$2*4*t)*exp(-22*t)+0.1*sin(2*PI*$2*2*t)*exp(-12*t))':s=$R:d=1.2" \
    -af "aecho=0.8:0.4:70:0.2,pan=stereo|c0=c0|c1=c0" "sfx/$1.wav"
}
note note-1 523.25
note note-2 659.25
note note-3 783.99
note note-4 1046.50

# Campanita (recordatorio guardado)
ff -f lavfi -i "aevalsrc='min(1,t*300)*(0.45*sin(2*PI*1318.5*t)*exp(-3.2*t)+0.22*sin(2*PI*2637*t)*exp(-5*t)+0.12*sin(2*PI*3955*t)*exp(-8*t)+0.3*sin(2*PI*987.8*(t-0.09))*exp(-3.5*(t-0.09))*gte(t,0.09))':s=$R:d=2.2" \
  -af "aecho=0.8:0.5:90|160:0.3|0.2,pan=stereo|c0=c0|c1=c0" sfx/chime.wav

# Burbuja de mensaje (chat)
ff -f lavfi -i "aevalsrc='min(1,t*500)*0.5*sin(2*PI*(520*t+900*t*t))*exp(-14*t)':s=$R:d=0.5" \
  -af "aecho=0.8:0.3:50:0.15,pan=stereo|c0=c0|c1=c0" sfx/bubble.wav

# Acorde brillante del cierre (Do mayor arpegiado)
ff -f lavfi -i "aevalsrc='
  0.30*sin(2*PI*523.25*t)*exp(-1.6*t)
 +0.26*sin(2*PI*659.25*(t-0.07))*exp(-1.6*(t-0.07))*gte(t,0.07)
 +0.24*sin(2*PI*783.99*(t-0.14))*exp(-1.6*(t-0.14))*gte(t,0.14)
 +0.22*sin(2*PI*1046.5*(t-0.21))*exp(-1.4*(t-0.21))*gte(t,0.21)
 +0.10*sin(2*PI*2093*(t-0.21))*exp(-3*(t-0.21))*gte(t,0.21)
 +0.12*sin(2*PI*261.63*t)*exp(-1.2*t)':s=$R:d=3.5" \
  -af "afade=t=in:d=0.01,aecho=0.8:0.55:110|210:0.35|0.25,pan=stereo|c0=c0|c1=c0" sfx/sparkle.wav

# Fondo ambiental suave (pad en Do mayor 9, con trémolo lento)
D=27
ff -f lavfi -i "aevalsrc='
  0.16*sin(2*PI*130.81*t)+0.12*sin(2*PI*196.00*t)+0.10*sin(2*PI*329.63*t)
 +0.07*sin(2*PI*493.88*t)+0.05*sin(2*PI*587.33*t)+0.06*sin(2*PI*261.63*t+sin(2*PI*0.2*t))'
  :s=$R:d=$D" \
  -af "volume='0.75+0.25*sin(2*PI*0.12*t)':eval=frame,lowpass=f=1800,aecho=0.8:0.7:400|800:0.35|0.25,afade=t=in:d=3,afade=t=out:st=$((D-4)):d=4,aeval='val(0)*(0.85+0.15*sin(2*PI*0.07*t))|val(0)*(0.85+0.15*cos(2*PI*0.07*t))':c=stereo" \
  sfx/ambient-pad.wav

# Normaliza: efectos con pico en -3 dB, el fondo ambiental más bajo (-12 dB)
norm() { # archivo pico_objetivo
  local peak gain
  peak=$(ffmpeg -i "$1" -af volumedetect -f null - 2>&1 | grep -oE "max_volume: [-0-9.]+" | awk '{print $2}')
  gain=$(awk -v p="$peak" -v t="$2" 'BEGIN{print t-p}')
  ff -i "$1" -af "volume=${gain}dB" "$1.tmp.wav" && mv "$1.tmp.wav" "$1"
}
for f in sfx/*.wav; do
  case "$f" in
    *ambient-pad*) norm "$f" -12 ;;
    *) norm "$f" -3 ;;
  esac
done
ls -la sfx
