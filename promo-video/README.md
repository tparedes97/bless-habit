# Video promo de Bless Habit (Remotion)

Video vertical 1080×1920, 30 fps, ~26 s, con sonido, para Reels, TikTok, Shorts y la ficha de Play Store.
El video renderizado está en `bless-habit-capacitor/play-store/promo-video-1080x1920.mp4`.

Escenas (`src/scenes/`): Hook → Breathe (logo) → Chat → Agenda → Widget → Growth → Cta.
Transiciones en `src/softTransition.tsx` (CSS puro, funcionan en cualquier navegador).
Sonidos en `public/sfx/`, sintetizados con `bash scripts/make-sfx.sh` (requiere ffmpeg).
Colores y fuentes en `src/theme.ts`; las fuentes van incluidas en `public/fonts/`.

```
npm i
npm run dev                                   # Remotion Studio para previsualizar y editar
npx remotion render BlessPromo out/bless-habit-promo.mp4 --crf=18
```

## Video POV (`BlessPov`)

Formato "POV" sin persona, ~21 s: noche de ansiedad → se lo cuentas a Bless → amanece tranquila → descarga.
Escenas en `src/pov/`. Video renderizado: `bless-habit-capacitor/play-store/promo-video-pov-1080x1920.mp4`.

```
npx remotion render BlessPov out/bless-habit-pov.mp4 --crf=18
```

## Video orgánico (`BlessOrganic`)

~35 s con pantallas REALES de la app (capturadas con Playwright desde una cuenta demo local),
textos estilo Instagram, toques en pantalla y música lo-fi. Muestra las funciones nuevas:
cronómetro por hábito, temporizador en la pantalla de bloqueo, metas por cantidad, posponer,
recordatorios tipo alarma y métricas. Capturas en `public/organic/`, escenas en `src/organic/`.
La pantalla de bloqueo y la notificación con botones están recreadas (son de Android nativo).

```
python3 scripts/make-music.py      # genera public/music/lofi-calm.wav (requiere numpy)
npx remotion render BlessOrganic out/bless-habit-organico.mp4 --crf=18
```
