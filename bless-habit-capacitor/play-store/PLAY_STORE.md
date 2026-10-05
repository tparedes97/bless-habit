# Publicar Bless Habit en Google Play

Paquete: `app.blesshabit.android` · versionCode 1 · versionName "1.0"

Todo lo que pide Play Console, listo para copiar y pegar. Las imágenes están en esta carpeta.

---

## 1. Generar el AAB firmado (Android Studio)

1. Node 22+ instalado. En `bless-habit-capacitor/`:
   ```
   npm install
   npx cap sync android
   npx cap open android
   ```
2. En Android Studio: **Settings → Build Tools → Gradle → Gradle JDK = jbr-21**. Espera a que sincronice.
3. Prueba en tu celular (cable + depuración USB → ▶ Run). Revisa:
   - Login con Google vuelve a la app.
   - Recordatorio de hábito llega como notificación **de la app** (pide permiso de notificaciones la primera vez).
   - En Perfil, Premium **no** muestra botón de pago (solo explica que se activa desde la web).
   - Botón atrás cierra diálogos; sin internet aparece la página offline.
   - PIN / huella si tienes Premium.
4. **Build → Generate Signed App Bundle or APK → Android App Bundle**.
   - "Create new…" keystore: guárdalo como `bless-habit-upload.jks`.
   - ⚠️ **Haz copia del .jks y de las contraseñas** (Drive + otro lugar). Sin él no puedes subir actualizaciones.
   - Variante `release` → genera `app/release/app-release.aab`.
5. Para cada actualización futura sube `versionCode` (2, 3, 4…) y `versionName` en `android/app/build.gradle`.

---

## 2. Crear la app en Play Console

- Nombre: **Bless Habit**
- Idioma predeterminado: Español (Latinoamérica) – es-419
- App o juego: **App** · Gratis o de pago: **Gratis**
- Activa **Play App Signing** (lo propone al subir el primer AAB).

---

## 3. Ficha de Play Store

### Español (es-419)

**Título (máx. 30):**
```
Bless Habit: hábitos y diario
```

**Descripción breve (máx. 80):**
```
Tu compañera de hábitos que te escucha: agenda, diario, ánimo y recordatorios 🌱
```

**Descripción completa:**
```
Bless es una compañera cálida que te ayuda a construir hábitos sin presión. Le cuentas tu día como a una amiga y ella organiza tu agenda, te recuerda lo importante y celebra contigo cada avance. 🌱

💬 CONVERSA CON BLESS
Escríbele lo que quieres hacer hoy o cómo te sientes. Bless entiende, te responde con cariño y arma tu día contigo.

📅 AGENDA Y HÁBITOS
Crea hábitos con días, hora y minutos por día. Marca lo que vas cumpliendo y mira tu racha crecer.

⏰ RECORDATORIOS
Notificaciones a la hora de tus hábitos para que no se te pase nada.

📔 DIARIO PERSONAL
Escribe cómo fue tu día, elige tu ánimo, agrega una foto y stickers. Tu espacio, a tu estilo.

📊 TU SEMANA Y TU ÁNIMO
Ve tu progreso semanal y cómo ha ido tu estado de ánimo.

✨ PREMIUM
Resumen semanal hecho por Bless, análisis de tu ánimo, chat y memoria ilimitados, hábitos ilimitados, temas y stickers extra para el diario, exportar el diario a PDF y bloqueo con PIN o huella.

🔒 PRIVACIDAD
Tus datos son tuyos. Puedes borrar tu cuenta y todo tu contenido desde la app cuando quieras.

Bless es una herramienta de bienestar y organización personal. No reemplaza la ayuda de un profesional de salud mental.
```

### English (en-US) — agrega como traducción

**Title:**
```
Bless Habit: habits & journal
```

**Short description:**
```
Your habit companion who listens: schedule, journal, mood and reminders 🌱
```

**Full description:**
```
Bless is a warm companion that helps you build habits without pressure. Tell her about your day like you would a friend, and she organizes your schedule, reminds you of what matters and celebrates every win with you. 🌱

💬 TALK TO BLESS
Tell her what you want to do today or how you feel. Bless understands, answers kindly and plans your day with you.

📅 SCHEDULE & HABITS
Create habits with days, time and minutes per day. Check them off and watch your streak grow.

⏰ REMINDERS
Notifications at your habit times so nothing slips by.

📔 PERSONAL JOURNAL
Write about your day, pick your mood, add a photo and stickers. Your space, your style.

📊 YOUR WEEK & MOOD
See your weekly progress and how your mood has been.

✨ PREMIUM
Weekly summary written by Bless, mood insights, unlimited chat and memory, unlimited habits, extra journal themes and stickers, journal PDF export and PIN or fingerprint lock.

🔒 PRIVACY
Your data is yours. You can delete your account and all your content from the app at any time.

Bless is a wellbeing and personal organization tool. It does not replace help from a mental health professional.
```

> No pongas precios ni "compra en la web" en la ficha ni dentro de la app: Google lo rechaza.

### Gráficos
- Ícono 512×512: `icon-512.png`
- Gráfico de funciones 1024×500: `feature-graphic-1024x500.png`
- Capturas de teléfono (mín. 2): `screenshot-1-chat.png` … `screenshot-5-diario.png`

### Categoría y contacto
- Categoría: **Estilo de vida** (o Productividad)
- Correo de contacto: tu correo de soporte
- Política de privacidad: `https://bless-habit.onrender.com/privacidad`

---

## 4. Contenido de la app (Policy → App content)

| Sección | Respuesta |
|---|---|
| Política de privacidad | `https://bless-habit.onrender.com/privacidad` |
| Anuncios | **No**, la app no tiene anuncios |
| Acceso a la app | **Toda la funcionalidad requiere acceso** → "Inicia sesión con cualquier cuenta de Google. No hace falta cuenta especial." |
| Clasificación de contenido | Ver abajo |
| Público objetivo | **18 y más** (evitas requisitos de apps para menores) |
| App de noticias | No |
| Apps de salud | Marca **No es una app de salud** o solo "Bienestar/estilo de vida" si lo pide; no hace diagnósticos |
| Gobierno | No |
| Funciones financieras | Ninguna |
| Contenido generado por IA | Sí: la app genera texto con IA y los usuarios pueden **reportar respuestas con el botón ⚑** en cada mensaje de Bless |

### Clasificación de contenido (cuestionario IARC)
- Categoría: **Todas las demás apps** (utilidad/productividad/estilo de vida).
- Violencia, sexo, drogas, apuestas, lenguaje: **No**.
- ¿Los usuarios interactúan o comparten contenido entre sí? **No** (el chat es solo con la IA).
- ¿Comparte ubicación? **No**.
- ¿Compras digitales? **No** (dentro de la app no se vende nada).

### Seguridad de los datos (Data safety)
- ¿Recopila o comparte datos? **Sí recopila**, **no comparte** con terceros (OpenAI y Paddle son proveedores de servicio que procesan por ti → no cuenta como "compartir").
- ¿Cifrado en tránsito? **Sí** (HTTPS).
- ¿El usuario puede pedir borrar los datos? **Sí** → en la app (Perfil → Eliminar cuenta) y en `https://bless-habit.onrender.com/eliminar-cuenta`.

Datos a declarar (todos: **recopilados, no compartidos, obligatorios, para Funcionalidad de la app y Gestión de la cuenta**):
- Información personal → **Nombre**, **Correo electrónico**
- Fotos y videos → **Fotos** (las del diario; opcional)
- Mensajes → **Otros mensajes en la app** (chat con Bless)
- Actividad en la app → **Otro contenido generado por el usuario** (diario, hábitos, ánimo)
- **No** declares información financiera: los pagos no ocurren en la app.

### Pagos dentro de la app
- La app **no vende nada** dentro: no hay botón de compra ni precio. Premium se activa en la web y la app solo lo reconoce al iniciar sesión (modelo "reader/consumption"). Si un revisor pregunta, responde eso.

---

## 5. Pruebas cerradas (obligatorio en cuentas personales nuevas)

Google exige **12 testers durante 14 días seguidos** antes de poder pedir producción.

1. Testing → **Closed testing** → crea un track → sube el `.aab`.
2. Testers: lista de correos Gmail (mínimo 12; pon 15 por si alguno falla).
3. Comparte el enlace de inscripción; cada uno debe **aceptar y descargar** la app.
4. Pide que la abran unos días. Pasados 14 días → **Apply for production** y responde el formulario.

---

## 6. Antes de pasar a producción

- **Google OAuth**: Google Cloud Console → pantalla de consentimiento → **Publicar app (In production)**; si no, solo pueden entrar los usuarios de prueba.
- **Render**: el plan gratis se duerme y la primera carga tarda ~50 s (la app muestra "cargando…"). Para usuarios reales conviene el plan **Starter ($7/mes)**.
- Revisa `/api/status` en producción (todo en verde).
- Revisa reportes de IA en la tabla `ai_reports` de Turso de vez en cuando.
