# Bless Habit — cáscara de Android (Capacitor)

Esto NO es una reescritura nativa de la app. Es una "cáscara" de Android que carga
la web real de Bless Habit (`https://bless-habit.onrender.com`, configurado en
`capacitor.config.json` → `server.url`) dentro de un WebView, con dos cosas nativas
agregadas: el login de Google abriéndose en el navegador del sistema (Google bloquea
el login dentro de un WebView embebido genérico) y el esquema de enlace personalizado
`blesshabit://auth-callback` para traer de vuelta la sesión a la app. Todo lo demás
— chat, calendario, diario, Premium, etc. — es exactamente la misma web que ya usas
en el navegador.

## Versión

Capacitor 8 (Android 16 / `targetSdk 36`, lo que Google Play exige para apps
nuevas). Requiere **Node.js 22 o superior** y **Android Studio** reciente
(con JDK 21, que ya trae incluido).

## Qué necesitas antes de empezar

1. **Android Studio** instalado (incluye el SDK de Android) — https://developer.android.com/studio
2. Una cuenta de **Google Play Console** (pago único ~$25) cuando llegue el momento de publicar.
3. Nada más — este proyecto ya viene con `android/` generado y sincronizado.

## Pasos para compilar

1. Descomprime este zip en tu computadora.
2. Abre una terminal dentro de la carpeta `bless-habit-capacitor/` y corre:
   ```
   npm install
   ```
   (reinstala las mismas dependencias de Capacitor que ya se usaron para generar
   este proyecto — no cambia nada, solo asegura que tengas los `node_modules`
   localmente).
   Y luego:
   ```
   npx cap sync android
   ```
   (regenera los archivos de `android/` que no se guardan en git, como
   `capacitor.plugins.json`).
3. Abre el proyecto en Android Studio:
   ```
   npx cap open android
   ```
   O directamente desde Android Studio: "Open" → selecciona la carpeta `android/`
   dentro de este proyecto.
4. Deja que Android Studio sincronice Gradle la primera vez (puede tardar unos
   minutos, descarga dependencias).
5. Para probar: conecta tu teléfono por USB (con depuración USB activada) o usa un
   emulador, y toca ▶ Run en Android Studio.

## Antes de publicar — lo que debes revisar tú misma

- **`server.url`** en `capacitor.config.json` ya apunta a tu app en producción
  (`https://bless-habit.onrender.com`). Si alguna vez cambias de dominio, ese es el
  único lugar que hay que editar (y volver a correr `npx cap sync android`).
- **Ícono y pantalla de inicio**: ya tienen un brote blanco sobre lavanda. El arte
  fuente está en `assets/` (`icon-only.png`, `icon-foreground.png`,
  `icon-background.png`, `splash.png`, `splash-dark.png`). Si quieres cambiarlo,
  reemplaza esos PNG (1024×1024 los íconos, 2732×2732 los splash) y corre:
  ```
  npx @capacitor/assets generate --android --iconBackgroundColor '#7C6CF0' --splashBackgroundColor '#F7F6FD' --splashBackgroundColorDark '#1b1830'
  ```
- **Firmar el `.aab`**: Android Studio → Build → Generate Signed Bundle / APK →
  Android App Bundle. Necesitas crear un keystore la primera vez (guárdalo en un
  lugar seguro, lo necesitas para cada actualización futura).
- **Login de Google dentro de la app**: ya está resuelto con el patrón de token de
  un solo uso (ver la sección correspondiente en el documento del proyecto) — no
  requiere que hagas nada adicional, pero sí requiere que tu `app.py` en producción
  tenga el manejo de `/auth/callback?native=1` y `/auth/native-exchange` ya
  desplegado (esto ya estaba en tu código desde que se construyó esta cáscara).
- **Pago Premium con Paddle**: el botón "Hazte Premium" de la app abre el checkout
  de Paddle en el navegador del sistema (`/premium/native-checkout` en `app.py`,
  con un token de un solo uso para identificar tu cuenta). Al pagar, el navegador
  vuelve a la app por `blesshabit://premium-done` y la app revisa si el Premium ya
  se activó (lo activa el webhook de Paddle). **Ojo con la política de Google
  Play**: para suscripciones digitales Google exige Play Billing, salvo en los
  países donde tiene programas de enlaces/pagos externos (p. ej. EE.UU. y el
  Espacio Económico Europeo), que además requieren inscribirse en Play Console.
  Revisa la política vigente antes de publicar — la app podría ser rechazada.
- **Política de Privacidad y Términos**: Play Console te va a pedir URLs públicas
  de ambos documentos (ver `bless-habit-legal/` si ya los tienes).

## Pantalla de carga y "sin conexión"

- Mientras llega la app desde el servidor se ve el logo con una ruedita
  (`res/layout/loading_overlay.xml`, la quita `MainActivity.java` al cargar). Si
  tarda más de 5 s aparece "Despertando a Bless…" — pasa cuando Render está dormido.
- Sin internet se muestra `www/error.html` (configurado en `server.errorPath`), que
  reintenta solo al volver la conexión. **Si cambias `server.url`, cambia también
  `SERVER_URL` dentro de `www/error.html`.**
- Para que Render casi nunca esté dormido: crea una cuenta gratis en
  https://cron-job.org y agrega un trabajo que visite
  `https://bless-habit.onrender.com/healthz` cada 10 minutos.

## Recordatorios

Usan `@capacitor/local-notifications`: el propio teléfono avisa a la hora de cada
hábito (sin Firebase ni servidor). Se activan al terminar la evaluación inicial o
desde Perfil → Notificaciones, y se reprograman solos cada vez que cambian los
hábitos. El ícono de la barra de estado es `res/drawable-*/ic_stat_bless.png`.

## Bloqueo con PIN y huella/rostro

El PIN (Premium) funciona igual en web y en la app. En Android, además, se puede
desbloquear con huella o rostro (`@capgo/capacitor-native-biometric`, permiso
`USE_BIOMETRIC` en el `AndroidManifest.xml`). El teléfono guarda una llave del
servidor en el almacén seguro de Android y solo la entrega tras la huella/rostro.
Pruébalo en un teléfono real con huella configurada: el emulador necesita una
huella registrada en sus ajustes.

## Estructura de este proyecto

- `capacitor.config.json` — configuración central (appId, nombre, URL del servidor).
- `android/` — el proyecto nativo de Android ya generado y sincronizado. Es lo que
  abres en Android Studio.
- `www/` — casi vacía: la app carga tu web en vivo desde `server.url`. Solo tiene
  `error.html`, la pantalla de "sin conexión".
- `package.json` — dependencias de Capacitor (`@capacitor/core`, `@capacitor/android`,
  `@capacitor/app`, `@capacitor/browser`, `@capacitor/local-notifications`).
- `assets/` — arte fuente del ícono y la pantalla de inicio.

## Si necesitas regenerar o actualizar este proyecto

Si alguna vez necesitas agregar un plugin de Capacitor nuevo o cambiar algo de
`capacitor.config.json`, el flujo es:
```
npm install   # si agregaste un plugin nuevo
npx cap sync android
```
Esto actualiza `android/` con cualquier cambio de configuración o de plugins, sin
perder tus ajustes manuales de Android Studio (ícono, firma, etc.).
