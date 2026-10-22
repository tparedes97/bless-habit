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
