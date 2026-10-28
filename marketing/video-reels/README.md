# Video de anuncio para Reels / TikTok (9:16, 19 s)

`Bless-anuncio-reels-9x16.mp4`: 1080×1920, 30 fps, con música.

Escenas: gancho («¿Empiezas hábitos y los dejas a la semana?») → chat con Bless →
recordatorios → progreso semanal → funciones → logo y botón «Empieza gratis hoy».
Usa las capturas reales de `bless-habit-capacitor/play-store/`.

## Volver a generarlo
Necesitas Node 22+, Playwright con Chromium, Python 3 con numpy y ffmpeg.
```
npm install
node render.js preview   # 6 imágenes de muestra (prev0..5.png)
node render.js full      # cuadros en frames/
python3 music.py         # music.wav
ffmpeg -y -framerate 30 -i frames/f%04d.jpg -i music.wav -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -shortest Bless-anuncio-reels-9x16.mp4
```
Los textos están en `index.html`; los tiempos de cada escena en `SC` y en `render()`.
