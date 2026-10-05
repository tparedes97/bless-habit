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
   - En Perfil, "✨ Hazte Premium" abre la ventana de planes de Google Play (los precios salen solo después de configurar la suscripción, sección 7).
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
La app de hábitos que te escucha: agenda, tareas, diario y recordatorios 🌱
```

**Descripción completa:**
```
Bless te acompaña a construir hábitos sin presión. Le cuentas tu día como a alguien de confianza y Bless organiza tu agenda, te recuerda lo importante y celebra contigo cada avance. 🌱

💬 CONVERSA CON BLESS
Escríbele lo que quieres hacer hoy o cómo te sientes. Bless entiende, te responde con cariño y arma tu día contigo.

📅 AGENDA Y HÁBITOS
Crea hábitos con días, hora y minutos por día. Marca lo que vas cumpliendo y mira tu racha crecer.

✅ TAREAS Y NOTAS DEL DÍA
Cada día tiene tus hábitos, tus tareas y tus notas. Escríbele a Bless "recuérdame pagar la luz el viernes a las 6" o "anota que…" y Bless lo guarda por ti.

⏰ RECORDATORIOS
Notificaciones a la hora de tus hábitos y tareas para que no se te pase nada.

📔 DIARIO PERSONAL
Escribe cómo fue tu día, elige tu ánimo, agrega una foto y stickers. Tu espacio, a tu estilo.

📊 TU SEMANA Y TU ÁNIMO
Ve tu progreso semanal y cómo ha ido tu estado de ánimo.

✨ PREMIUM
Resumen semanal hecho por Bless, análisis de tu ánimo, chat y memoria ilimitados, hábitos, tareas y notas ilimitados, recordatorios minutos antes, temas y stickers extra para el diario, exportar el diario a PDF y bloqueo con PIN o huella.

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
The habit app that listens: schedule, tasks, journal and reminders 🌱
```

**Full description:**
```
Bless helps you build habits without pressure. Tell Bless about your day like you would a friend, and Bless organizes your schedule, reminds you of what matters and celebrates every win with you. 🌱

💬 TALK TO BLESS
Tell Bless what you want to do today or how you feel. Bless understands, answers kindly and plans your day with you.

📅 SCHEDULE & HABITS
Create habits with days, time and minutes per day. Check them off and watch your streak grow.

✅ DAILY TASKS & NOTES
Every day has your habits, tasks and notes. Tell Bless "remind me to pay the bill Friday at 6" or "take a note…" and Bless saves it for you.

⏰ REMINDERS
Notifications at your habit and task times so nothing slips by.

📔 PERSONAL JOURNAL
Write about your day, pick your mood, add a photo and stickers. Your space, your style.

📊 YOUR WEEK & MOOD
See your weekly progress and how your mood has been.

✨ PREMIUM
Weekly summary written by Bless, mood insights, unlimited chat and memory, unlimited habits, tasks and notes, reminders minutes ahead, extra journal themes and stickers, journal PDF export and PIN or fingerprint lock.

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
- ¿Compras digitales? **Sí** (suscripción Premium con Google Play).

### Seguridad de los datos (Data safety)
- ¿Recopila o comparte datos? **Sí recopila**, **no comparte** con terceros (OpenAI y Paddle son proveedores de servicio que procesan por ti → no cuenta como "compartir").
- ¿Cifrado en tránsito? **Sí** (HTTPS).
- ¿El usuario puede pedir borrar los datos? **Sí** → en la app (Perfil → Eliminar cuenta) y en `https://bless-habit.onrender.com/eliminar-cuenta`.

Datos a declarar (todos: **recopilados, no compartidos, obligatorios, para Funcionalidad de la app y Gestión de la cuenta**):
- Información personal → **Nombre**, **Correo electrónico**
- Fotos y videos → **Fotos** (las del diario; opcional)
- Mensajes → **Otros mensajes en la app** (chat con Bless)
- Actividad en la app → **Otro contenido generado por el usuario** (diario, hábitos, ánimo)
- Información financiera → **Historial de compras** (la suscripción de Google Play; nunca vemos datos de tarjeta)

### Pagos dentro de la app
- **Sí** tiene compras dentro de la app: suscripción Bless Habit Premium con **Google Play Billing** (mensual y anual).
- En la ficha, Play mostrará "Ofrece compras directas en la app" automáticamente.

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

---

## 7. Configurar Google Play Billing (Premium dentro de la app)

La app ya trae el código. Tú configuras esto **una sola vez**:

### 7.1 Subir la app a Prueba interna
Google solo deja crear suscripciones después de subir una versión que use pagos.
Testing → **Internal testing** → Create release → sube el `.aab` → Save → Review → **Start rollout**.

### 7.2 Crear la suscripción
Monetize → Products → **Subscriptions** → Create subscription:
- **Product ID:** `bless_premium` (exacto, no se puede cambiar después)
- **Name:** Bless Habit Premium
- Dentro, **Add base plan** (dos veces):

| Base plan ID | Tipo | Periodo | Precio |
|---|---|---|---|
| `monthly` | Auto-renewing | 1 month | USD 2.99 |
| `yearly` | Auto-renewing | 1 year | USD 24.99 |

Al poner el precio en USD, Google sugiere el precio de cada país (puedes aceptarlo tal cual). **Activate** cada plan base.

### 7.3 Cuenta de servicio (para que tu servidor confirme las compras)
1. **Google Cloud Console** (el mismo proyecto del login con Google) → APIs & Services → Library → busca **Google Play Android Developer API** → **Enable**.
2. IAM & Admin → **Service Accounts** → Create service account → nombre `bless-play-billing` → Done (sin roles).
3. Entra a la cuenta creada → **Keys** → Add key → Create new key → **JSON** → se descarga un archivo. ⚠️ Es una clave secreta: no la compartas ni la pegues en chats.
4. **Play Console** → Users and permissions → **Invite new users** → pega el correo de la cuenta de servicio (termina en `iam.gserviceaccount.com`) → pestaña **App permissions** → agrega Bless Habit → marca **View financial data** y **Manage orders and subscriptions** → Invite user.
5. **Render** → tu servicio → Environment → Add variable:
   - Key: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
   - Value: abre el archivo JSON con el Bloc de notas, copia **todo** y pégalo.
   - Save → se redeploya solo.

> Google puede tardar **hasta 24-36 horas** en activar los permisos de la cuenta de servicio. Si al probar sale "no se pudo confirmar", espera y prueba de nuevo.

### 7.4 Probar sin pagar de verdad
Play Console → Settings → **License testing** → agrega tu Gmail (y el de tus testers) → Save.
Instala la app desde el enlace de Prueba interna con esa cuenta: al comprar, Google muestra "Tarjeta de prueba, se aprueba siempre" y no cobra. Las suscripciones de prueba se renuevan cada pocos minutos y se cancelan solas.

### Cómo funciona
- La app compra con Google Play y manda el comprobante al servidor; el servidor lo **confirma con Google** antes de activar Premium (nadie puede activarlo sin pagar).
- Cada compra queda ligada a la cuenta Bless que la hizo.
- Si alguien cancela o pide reembolso, el servidor lo detecta (revisa con Google cada 12 h) y Premium se apaga al terminar lo pagado.
- Quien pagó en la web (Paddle) también tiene Premium en la app con la misma cuenta, y al revés.
- "Restaurar compra" (en Perfil y en la ventana de planes) recupera Premium al cambiar de celular.
