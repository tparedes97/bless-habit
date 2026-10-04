import os
import re
import json
import base64
import sqlite3
import hmac
import hashlib
import time
import secrets
import requests
try:
    import libsql  # pip install libsql — cliente de Turso, compatible con la API de sqlite3
except ImportError:
    libsql = None
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, Response
from openai import OpenAI
from authlib.integrations.flask_client import OAuth
from pywebpush import webpush, WebPushException
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
# Render (y la mayoría de hosts en la nube) reciben las peticiones por HTTPS en su
# proxy, pero se las reenvían a la app por HTTP simple. Sin este ProxyFix, Flask
# cree que todo llega por HTTP y genera URLs de redirect_uri con "http://" en vez
# de "https://", lo que rompe el login de Google (error redirect_uri_mismatch).
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-cambia-esto-en-produccion")
if not os.environ.get("FLASK_SECRET_KEY"):
    print("[seguridad] FALTA FLASK_SECRET_KEY: cualquiera podría falsificar sesiones. Configúrala en Render.")
# La sesión dura un año (en vez de morir al cerrar el navegador): el WebView de
# la app de Android borra las cookies "de sesión" cuando el sistema cierra la
# app, y sin esto habría que volver a iniciar sesión con Google cada vez.
from datetime import timedelta
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=365)
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") != "development"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# ============================================================
# OPENAI — la key vive SOLO en el servidor (Replit Secrets).
# ============================================================
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    # Ojo: openai<1.55 se rompía al crear el cliente con httpx>=0.28 ("unexpected
    # keyword argument 'proxies'") y Bless nunca llegaba a usar la IA. Por eso
    # requirements.txt fija una versión más nueva.
    return OpenAI(api_key=api_key)


# ============================================================
# PADDLE BILLING — plan Premium ($4.99/mes, sin publicidad + métricas
# completas), elegido en vez de Culqi porque Paddle es "Merchant of
# Record": cobra a cualquier país, y se encarga de los impuestos
# (IVA/sales tax) de cada uno por ti — Culqi solo resuelve Perú.
# ============================================================
# Las credenciales viven SOLO en el servidor (Replit Secrets), nunca en el
# navegador, salvo PADDLE_CLIENT_TOKEN, que es pública por diseño (está
# pensada para usarse en el navegador con Paddle.js).
#
# IMPORTANTE: este entorno de trabajo no tiene salida a internet hacia APIs
# externas, así que estas llamadas a Paddle NO se pudieron probar en vivo.
# Antes de cobrar de verdad, confirma los detalles contra la documentación
# oficial: https://developer.paddle.com — sobre todo el endpoint exacto de
# cancelar una suscripción, que aquí se implementó según lo documentado
# pero sin poder confirmarlo con una llamada real.
PADDLE_API_KEY = os.environ.get("PADDLE_API_KEY")  # secreta, server-side (Bearer token)
PADDLE_CLIENT_TOKEN = os.environ.get("PADDLE_CLIENT_TOKEN")  # pública, para Paddle.js en el navegador
PADDLE_PRICE_ID = os.environ.get("PADDLE_PRICE_ID")  # el price_id del plan de $4.99/mes, se crea en el catálogo de Paddle
PADDLE_WEBHOOK_SECRET = os.environ.get("PADDLE_WEBHOOK_SECRET")  # de Dashboard → Developer Tools → Notifications
# "sandbox" (por defecto, para no cobrar de verdad por accidente) o "production"
PADDLE_ENV = os.environ.get("PADDLE_ENV", "sandbox")
PADDLE_API_BASE = "https://api.paddle.com" if PADDLE_ENV == "production" else "https://sandbox-api.paddle.com"


def paddle_configured():
    return bool(PADDLE_API_KEY and PADDLE_CLIENT_TOKEN and PADDLE_PRICE_ID)


def paddle_headers():
    return {"Authorization": f"Bearer {PADDLE_API_KEY}", "Content-Type": "application/json"}


def verify_paddle_webhook_signature(raw_body, signature_header, secret):
    """Verifica la firma del webhook de Paddle.
    Formato del header Paddle-Signature: "ts=<unix_ts>;h1=<hex_hmac>"
    Algoritmo: HMAC-SHA256 sobre el string "<ts>:<raw_body>" (sin reformatear el body).
    Ver: https://developer.paddle.com/webhooks/signature-verification
    """
    if not signature_header or not secret:
        return False
    parts = dict(p.split("=", 1) for p in signature_header.split(";") if "=" in p)
    ts, h1 = parts.get("ts"), parts.get("h1")
    if not ts or not h1:
        return False
    signed_payload = f"{ts}:{raw_body.decode('utf-8') if isinstance(raw_body, bytes) else raw_body}"
    computed = hmac.new(secret.encode("utf-8"), signed_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, h1)


# Texto del precio que se muestra en la interfaz (botón de upgrade, tarjeta de
# bloqueo de Métricas, etc.) — se puede cambiar en Secrets sin tocar código,
# justo para que el precio y el código no queden pegados uno al otro.
PADDLE_PRICE_LABEL = os.environ.get("PADDLE_PRICE_LABEL", "$4.99/mes")

# Google AdSense — solo se muestra a usuarios del plan gratuito.
ADSENSE_CLIENT_ID = os.environ.get("ADSENSE_CLIENT_ID", "")
ADSENSE_SLOT_ID = os.environ.get("ADSENSE_SLOT_ID", "")

# ============================================================
# NOTIFICACIONES PUSH (Web Push + VAPID) — para el reenganche compasivo
# ("no te sientas culpable, siempre se puede comenzar de nuevo") que hasta
# ahora solo existía simulado con un botón de prueba en el chat.
# ============================================================
# Genera tu propio par de claves VAPID corriendo una vez (ver generate_vapid_keys.py):
#   python3 generate_vapid_keys.py
# y copia los dos valores a Replit Secrets.
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")  # b64url "crudo" (DER), UNA sola línea, sin -----BEGIN/END-----
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")  # el mismo par, en formato b64url, para el navegador
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "soporte@blesshabit.app")
# Secreto compartido para permitir que un cron externo (ej. cron-job.org, gratis)
# dispare el envío diario de reenganche sin necesitar iniciar sesión.
PUSH_BATCH_SECRET = os.environ.get("PUSH_BATCH_SECRET", "")


def push_configured():
    return bool(VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY)


REENGAGE_PUSH_MESSAGES = [
    "Hola de nuevo 🤍. No te sientas culpable — siempre se puede comenzar de nuevo. ¿Retomamos hoy, aunque sea con algo pequeño?",
    "Te extrañé 🤍. Esto no se trata de ser perfecta, se trata de volver. ¿Empezamos de nuevo, sin presión?",
]


# ============================================================
# BASE DE DATOS — Turso (libSQL en la nube) en producción, SQLite local como
# respaldo para desarrollo.
#
# HISTORIA: originalmente esto era SQLite guardado dentro de la propia carpeta
# de código de la app. En Render (tier gratuito), esa carpeta se recrea desde
# cero cada vez que el servidor "duerme" (tras 15 min sin uso) y despierta —
# no hace falta ni un despliegue nuevo — así que la base se perdía todo el
# tiempo. Investigamos agregar un "Persistent Disk" de Render, pero ese
# tier gratuito NO permite discos persistentes (son solo para planes pagados,
# desde $7/mes). Por eso se migró a **Turso** (https://turso.tech), que ofrece
# una base de datos compatible con SQLite alojada en la nube, con un plan
# gratis generoso — los datos viven ahí, no en el disco del servidor, así que
# sobreviven los reinicios/despliegues de Render sin pagar nada extra.
#
# CONFIGURACIÓN QUE TANIA DEBE HACER (una sola vez):
#   1) Crear una cuenta gratis en https://turso.tech y una base de datos nueva
#      (por consola web o con su CLI: `turso db create bless-habit`).
#   2) Conseguir la URL de conexión (algo como
#      libsql://bless-habit-<usuario>.turso.io) y un token de acceso
#      (`turso db tokens create bless-habit` o el botón "Create Token" en el
#      dashboard).
#   3) Agregar dos variables en Render Secrets:
#        TURSO_DATABASE_URL = libsql://... (la URL del paso 2)
#        TURSO_AUTH_TOKEN   = el token del paso 2
#   4) Volver a desplegar. Cuando ambas variables están configuradas, la app
#      usa Turso automáticamente; si faltan, sigue funcionando con SQLite
#      local (útil para probar en la propia computadora), pero SIN
#      persistencia real en Render.
# ============================================================
TURSO_DATABASE_URL = os.environ.get("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")
USE_TURSO = bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN and libsql is not None)

# Respaldo local (desarrollo, o producción si Turso no está configurado — en
# ese caso vuelve a tener el mismo problema de persistencia de siempre).
DB_PATH = os.environ.get("DATABASE_PATH") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "bless_habit.db")


def get_db():
    if USE_TURSO:
        return libsql.connect(database=TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)
    return sqlite3.connect(DB_PATH)


# El cliente de Turso (libsql) NO tiene el `row_factory` de sqlite3 (no existe
# `conn.row_factory = sqlite3.Row`), así que en vez de depender de eso,
# convertimos las filas a diccionarios a mano usando `cursor.description` —
# funciona igual con SQLite local y con Turso, sin depender de esa función.
def _row_to_dict(cur, row):
    if row is None:
        return None
    return dict(zip([c[0] for c in cur.description], row))


def _rows_to_dicts(cur, rows):
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE NOT NULL,
            email TEXT,
            name TEXT,
            picture TEXT,
            is_premium INTEGER DEFAULT 0,
            paddle_customer_id TEXT,
            paddle_subscription_id TEXT,
            premium_since TEXT,
            app_pin_hash TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_state (
            user_id INTEGER PRIMARY KEY,
            state_json TEXT NOT NULL,
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            endpoint TEXT UNIQUE NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    # Códigos de un solo uso (login y pago desde la app de Android). Viven en
    # la base y no en memoria: si Render se duerme o reinicia justo entre
    # abrir el navegador y volver a la app, el código sigue sirviendo.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS one_time_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            expires_at REAL NOT NULL
        )
    """)
    # Fotos del diario: aparte del estado, para que cada guardado no reenvíe
    # todas las fotos (el estado completo se manda en cada cambio).
    conn.execute("""
        CREATE TABLE IF NOT EXISTS diary_photos (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            mime TEXT NOT NULL,
            data_b64 TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    # Desbloqueo con huella/rostro (app de Android): cada teléfono guarda una
    # llave secreta en el almacén seguro de Android; aquí solo su hash.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS biometric_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            key_hash TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    # Migración suave: agrega columnas nuevas si la base ya existía sin ellas
    # (por ejemplo una base creada antes de Premium, o todavía con las
    # columnas viejas de Culqi de una versión anterior de este archivo).
    cur = conn.execute("PRAGMA table_info(users)")
    existing_cols = {r["name"] for r in _rows_to_dicts(cur, cur.fetchall())}
    for col, ddl in [
        ("is_premium", "ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0"),
        ("paddle_customer_id", "ALTER TABLE users ADD COLUMN paddle_customer_id TEXT"),
        ("paddle_subscription_id", "ALTER TABLE users ADD COLUMN paddle_subscription_id TEXT"),
        ("premium_since", "ALTER TABLE users ADD COLUMN premium_since TEXT"),
        ("app_pin_hash", "ALTER TABLE users ADD COLUMN app_pin_hash TEXT"),
    ]:
        if col not in existing_cols:
            conn.execute(ddl)
    conn.commit()
    conn.close()


init_db()


def get_or_create_user(google_id, email, name, picture):
    conn = get_db()
    cur = conn.execute("SELECT id FROM users WHERE google_id = ?", (google_id,))
    row = _row_to_dict(cur, cur.fetchone())
    if row:
        user_id = row["id"]
        conn.execute("UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?", (email, name, picture, user_id))
    else:
        cur2 = conn.execute(
            "INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)",
            (google_id, email, name, picture),
        )
        user_id = cur2.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_user(user_id):
    conn = get_db()
    cur = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = _row_to_dict(cur, cur.fetchone())
    conn.close()
    return row


def find_user_by_email(email):
    if not email:
        return None
    conn = get_db()
    cur = conn.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = _row_to_dict(cur, cur.fetchone())
    conn.close()
    return row


def load_user_state(user_id):
    conn = get_db()
    cur = conn.execute("SELECT state_json FROM user_state WHERE user_id = ?", (user_id,))
    row = _row_to_dict(cur, cur.fetchone())
    conn.close()
    return json.loads(row["state_json"]) if row else None


def save_user_state(user_id, state_dict):
    conn = get_db()
    conn.execute("""
        INSERT INTO user_state (user_id, state_json, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')
    """, (user_id, json.dumps(state_dict)))
    conn.commit()
    conn.close()


def set_user_premium(user_id, is_premium, customer_id=None, subscription_id=None):
    conn = get_db()
    conn.execute("""
        UPDATE users SET
            is_premium = ?,
            paddle_customer_id = COALESCE(?, paddle_customer_id),
            paddle_subscription_id = COALESCE(?, paddle_subscription_id),
            premium_since = CASE WHEN ? = 1 AND premium_since IS NULL THEN datetime('now') ELSE premium_since END
        WHERE id = ?
    """, (1 if is_premium else 0, customer_id, subscription_id, 1 if is_premium else 0, user_id))
    conn.commit()
    conn.close()


def create_one_time_token(user_id, kind, ttl_seconds):
    token = secrets.token_urlsafe(32)
    conn = get_db()
    conn.execute("DELETE FROM one_time_tokens WHERE expires_at < ?", (time.time(),))
    conn.execute(
        "INSERT INTO one_time_tokens (token, user_id, kind, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, kind, time.time() + ttl_seconds),
    )
    conn.commit()
    conn.close()
    return token


def consume_one_time_token(token, kind):
    """Devuelve el user_id y borra el token (sirve una sola vez), o None si no
    existe, es de otro tipo o ya expiró."""
    if not token:
        return None
    conn = get_db()
    cur = conn.execute("SELECT user_id, kind, expires_at FROM one_time_tokens WHERE token = ?", (token,))
    row = _row_to_dict(cur, cur.fetchone())
    if row:
        conn.execute("DELETE FROM one_time_tokens WHERE token = ?", (token,))
        conn.commit()
    conn.close()
    if not row or row["kind"] != kind or row["expires_at"] < time.time():
        return None
    return row["user_id"]


def save_diary_photo(user_id, mime, data_b64):
    photo_id = secrets.token_urlsafe(16)
    conn = get_db()
    conn.execute(
        "INSERT INTO diary_photos (id, user_id, mime, data_b64, created_at) VALUES (?, ?, ?, ?, ?)",
        (photo_id, user_id, mime, data_b64, time.time()),
    )
    conn.commit()
    conn.close()
    return photo_id


def get_diary_photo(user_id, photo_id):
    conn = get_db()
    cur = conn.execute("SELECT mime, data_b64 FROM diary_photos WHERE id = ? AND user_id = ?", (photo_id, user_id))
    row = _row_to_dict(cur, cur.fetchone())
    conn.close()
    return row


def delete_unreferenced_diary_photos(user_id, referenced_ids, min_age_seconds=3600):
    """Borra las fotos del usuario que ya no usa ninguna entrada del diario.
    Solo las de más de 1 hora: una recién subida puede no estar guardada aún
    en el estado."""
    conn = get_db()
    cur = conn.execute(
        "SELECT id FROM diary_photos WHERE user_id = ? AND created_at < ?",
        (user_id, time.time() - min_age_seconds),
    )
    stale = [r["id"] for r in _rows_to_dicts(cur, cur.fetchall()) if r["id"] not in referenced_ids]
    for photo_id in stale:
        conn.execute("DELETE FROM diary_photos WHERE id = ?", (photo_id,))
    if stale:
        conn.commit()
    conn.close()


def set_app_pin_hash(user_id, pin_hash):
    conn = get_db()
    conn.execute("UPDATE users SET app_pin_hash = ? WHERE id = ?", (pin_hash, user_id))
    if not pin_hash:
        # Sin PIN no hay bloqueo: las llaves de huella/rostro dejan de servir.
        conn.execute("DELETE FROM biometric_keys WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


def find_user_by_paddle_customer(customer_id):
    conn = get_db()
    cur = conn.execute("SELECT * FROM users WHERE paddle_customer_id = ?", (customer_id,))
    row = _row_to_dict(cur, cur.fetchone())
    conn.close()
    return row


def find_user_by_paddle_subscription(subscription_id):
    conn = get_db()
    cur = conn.execute("SELECT * FROM users WHERE paddle_subscription_id = ?", (subscription_id,))
    row = _row_to_dict(cur, cur.fetchone())
    conn.close()
    return row


def save_push_subscription(user_id, endpoint, p256dh, auth):
    conn = get_db()
    conn.execute("""
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
    """, (user_id, endpoint, p256dh, auth))
    conn.commit()
    conn.close()


def remove_push_subscription(endpoint):
    conn = get_db()
    conn.execute("DELETE FROM push_subscriptions WHERE endpoint = ?", (endpoint,))
    conn.commit()
    conn.close()


def get_push_subscriptions_for_user(user_id):
    conn = get_db()
    cur = conn.execute("SELECT * FROM push_subscriptions WHERE user_id = ?", (user_id,))
    rows = _rows_to_dicts(cur, cur.fetchall())
    conn.close()
    return rows


def get_inactive_users_with_push(days_inactive):
    """Usuarios con al menos una suscripción push, cuyo estado no se actualiza hace
    `days_inactive` días o más (candidatos al mensaje de reenganche compasivo)."""
    conn = get_db()
    cur = conn.execute("""
        SELECT DISTINCT u.id as user_id, u.name
        FROM users u
        JOIN push_subscriptions ps ON ps.user_id = u.id
        JOIN user_state us ON us.user_id = u.id
        WHERE datetime(us.updated_at) <= datetime('now', ?)
    """, (f"-{int(days_inactive)} days",))
    rows = _rows_to_dicts(cur, cur.fetchall())
    conn.close()
    return rows


def send_push_to_user(user_id, title, body, url="/"):
    """Manda una notificación a TODAS las suscripciones push del usuario (puede tener
    más de una si la activó en varios dispositivos/navegadores). Si una suscripción ya
    no es válida (el navegador la revocó — típico código 404/410), se borra sola."""
    if not push_configured():
        return {"ok": False, "error": "VAPID no configurado"}
    subs = get_push_subscriptions_for_user(user_id)
    results = []
    payload = json.dumps({"title": title, "body": body, "url": url})
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"},
            )
            results.append({"endpoint": sub["endpoint"][:40] + "...", "ok": True})
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                remove_push_subscription(sub["endpoint"])
            results.append({"endpoint": sub["endpoint"][:40] + "...", "ok": False, "status": status, "error": str(e)})
        except Exception as e:
            # Defensa extra: una VAPID_PRIVATE_KEY mal formada, una suscripción corrupta,
            # etc. nunca debe tumbar el request con un 500 sin manejar.
            results.append({"endpoint": sub["endpoint"][:40] + "...", "ok": False, "status": None, "error": str(e)})
    return {"ok": True, "results": results}


# ============================================================
# LOGIN CON GOOGLE (OAuth vía Authlib)
# ============================================================
oauth = OAuth(app)
google = oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


# ============================================================
# LOGIN NATIVO (Capacitor / Android) — Google bloquea el login dentro de un
# WebView embebido ("disallowed_useragent"), así que la app nativa abre el
# navegador del sistema para hacer el login. Al terminar, el navegador del
# sistema tiene la cookie de sesión, pero el WebView de la app (que es un
# "contenedor" aparte) no la comparte automáticamente. Por eso usamos un
# token de un solo uso: el navegador del sistema termina en un enlace
# personalizado (blesshabit://auth-callback?token=...), la app nativa
# intercepta ese enlace y llama a /auth/native-exchange desde SU PROPIO
# WebView para completar el login ahí también.
# Los tokens se guardan en la base (ver create_one_time_token) y expiran en
# 5 minutos.
# ============================================================
NATIVE_TOKEN_TTL_SECONDS = 300
NATIVE_APP_URL_SCHEME = os.environ.get("NATIVE_APP_URL_SCHEME", "blesshabit")


@app.route("/auth/login")
def auth_login():
    if not os.environ.get("GOOGLE_CLIENT_ID") or not os.environ.get("GOOGLE_CLIENT_SECRET"):
        return (
            "Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las Secrets del "
            "servidor. Consíguelos en Google Cloud Console y agrégalos antes de iniciar sesión.",
            500,
        )
    if request.args.get("native") == "1":
        session["native_login"] = True
    if request.args.get("reset_pin") == "1":
        session["reset_pin"] = True
    redirect_uri = url_for("auth_callback", _external=True)
    return google.authorize_redirect(redirect_uri)


@app.route("/auth/callback")
def auth_callback():
    # Si la persona cancela en la pantalla de Google (o el estado de OAuth se
    # perdió porque el servidor se reinició), Authlib lanza una excepción: en
    # vez de un error 500, la devolvemos a la pantalla de login.
    try:
        token = google.authorize_access_token()
    except Exception as e:
        print(f"[auth] login cancelado o fallido: {e}")
        token = None
    userinfo = token.get("userinfo") if token else None
    if not userinfo:
        if session.pop("native_login", False):
            return redirect(f"{NATIVE_APP_URL_SCHEME}://auth-callback?error=1")
        return redirect("/")
    user_id = get_or_create_user(
        google_id=userinfo["sub"],
        email=userinfo.get("email"),
        name=userinfo.get("name"),
        picture=userinfo.get("picture"),
    )
    session.permanent = True
    session["user_id"] = user_id
    if session.pop("reset_pin", False):
        # "¿Olvidaste tu PIN?": volver a entrar con Google desactiva el bloqueo.
        set_app_pin_hash(user_id, None)
    if session.pop("native_login", False):
        exchange_token = create_one_time_token(user_id, "login", NATIVE_TOKEN_TTL_SECONDS)
        return redirect(f"{NATIVE_APP_URL_SCHEME}://auth-callback?token={exchange_token}")
    return redirect("/")


@app.route("/auth/native-exchange")
def auth_native_exchange():
    """La app nativa llama esto DESDE SU PROPIO WebView (no desde el navegador
    del sistema) con el token que recibió por el enlace personalizado, para
    obtener su propia cookie de sesión."""
    user_id = consume_one_time_token(request.args.get("token", ""), "login")
    if not user_id:
        return "Enlace de acceso inválido o expirado. Intenta iniciar sesión de nuevo.", 400
    session.permanent = True
    session["user_id"] = user_id
    return redirect("/")


@app.route("/auth/logout")
def auth_logout():
    session.pop("user_id", None)
    return redirect("/")


@app.route("/api/me")
def api_me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"loggedIn": False})
    user = get_user(user_id)
    if not user:
        session.pop("user_id", None)
        return jsonify({"loggedIn": False})
    return jsonify({
        "loggedIn": True,
        "name": user["name"],
        "email": user["email"],
        "picture": user["picture"],
        "premium": bool(user["is_premium"]),
        "appLock": bool(user.get("app_pin_hash")),
    })


# ============================================================
# BLOQUEO CON PIN (Premium) — la app pide un PIN de 4 dígitos al abrirse. El
# PIN se guarda con hash (nunca en texto plano) y el servidor no entrega el
# estado (chat, diario, recuerdos) hasta que se ingresa bien en esta sesión.
# El desbloqueo dura mientras haya actividad (30 min desde el último uso); la
# app además vuelve a bloquearse sola al volver tras 1 minuto fuera.
# ============================================================
APP_LOCK_IDLE_SECONDS = 30 * 60
APP_LOCK_MAX_ATTEMPTS = 5
APP_LOCK_WAIT_SECONDS = 60
PIN_RE = re.compile(r"^\d{4}$")


def app_lock_blocks(user_id):
    """True si la cuenta tiene PIN y esta sesión no está desbloqueada."""
    user = get_user(user_id)
    if not user or not user.get("app_pin_hash"):
        return False
    unlocked_at = session.get("unlocked_at") or 0
    if time.time() - unlocked_at > APP_LOCK_IDLE_SECONDS:
        return True
    session["unlocked_at"] = time.time()  # ventana deslizante mientras se usa
    return False


def locked_response():
    return jsonify({"ok": False, "locked": True, "error": "La app está bloqueada con PIN"}), 423


@app.route("/api/app-lock/verify", methods=["POST"])
def api_app_lock_verify():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    wait_until = session.get("pin_wait_until") or 0
    if time.time() < wait_until:
        return jsonify({"ok": False, "wait": int(wait_until - time.time()) + 1}), 429
    user = get_user(user_id)
    pin = str((request.get_json(force=True) or {}).get("pin") or "")
    if not user or not user.get("app_pin_hash"):
        session["unlocked_at"] = time.time()
        return jsonify({"ok": True})
    if PIN_RE.match(pin) and check_password_hash(user["app_pin_hash"], pin):
        session["unlocked_at"] = time.time()
        session.pop("pin_attempts", None)
        return jsonify({"ok": True})
    attempts = (session.get("pin_attempts") or 0) + 1
    session["pin_attempts"] = attempts
    if attempts >= APP_LOCK_MAX_ATTEMPTS:
        session["pin_attempts"] = 0
        session["pin_wait_until"] = time.time() + APP_LOCK_WAIT_SECONDS
        return jsonify({"ok": False, "wait": APP_LOCK_WAIT_SECONDS}), 429
    return jsonify({"ok": False, "attemptsLeft": APP_LOCK_MAX_ATTEMPTS - attempts}), 401


def _biometric_key_hash(key):
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


@app.route("/api/app-lock/biometric/enroll", methods=["POST"])
def api_biometric_enroll():
    """Crea la llave del teléfono. Solo con el PIN activo y la sesión desbloqueada."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    user = get_user(user_id)
    if not user.get("app_pin_hash"):
        return jsonify({"ok": False, "error": "Primero activa el PIN"}), 400
    if app_lock_blocks(user_id):
        return locked_response()
    key = secrets.token_urlsafe(32)
    conn = get_db()
    conn.execute("INSERT INTO biometric_keys (user_id, key_hash, created_at) VALUES (?, ?, ?)",
                 (user_id, _biometric_key_hash(key), time.time()))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "key": key})


@app.route("/api/app-lock/biometric/verify", methods=["POST"])
def api_biometric_verify():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    key = str((request.get_json(force=True) or {}).get("key") or "")
    conn = get_db()
    cur = conn.execute("SELECT id FROM biometric_keys WHERE user_id = ? AND key_hash = ?", (user_id, _biometric_key_hash(key)))
    row = cur.fetchone()
    conn.close()
    if not key or not row:
        return jsonify({"ok": False, "error": "invalid_key"}), 401
    session["unlocked_at"] = time.time()
    return jsonify({"ok": True})


@app.route("/api/app-lock/lock", methods=["POST"])
def api_app_lock_lock():
    session.pop("unlocked_at", None)
    return jsonify({"ok": True})


@app.route("/api/app-lock/set", methods=["POST"])
def api_app_lock_set():
    """Activar o cambiar el PIN. Solo Premium. Para cambiarlo hace falta el actual."""
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    user = get_user(user_id)
    if not user["is_premium"]:
        return jsonify({"ok": False, "error": "premium_required"}), 403
    data = request.get_json(force=True) or {}
    pin = str(data.get("pin") or "")
    if not PIN_RE.match(pin):
        return jsonify({"ok": False, "error": "El PIN debe tener 4 dígitos"}), 400
    if user.get("app_pin_hash"):
        current = str(data.get("currentPin") or "")
        if not (PIN_RE.match(current) and check_password_hash(user["app_pin_hash"], current)):
            return jsonify({"ok": False, "error": "wrong_pin"}), 401
    set_app_pin_hash(user_id, generate_password_hash(pin))
    session["unlocked_at"] = time.time()
    return jsonify({"ok": True})


@app.route("/api/app-lock/disable", methods=["POST"])
def api_app_lock_disable():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    user = get_user(user_id)
    pin = str((request.get_json(force=True) or {}).get("pin") or "")
    if user.get("app_pin_hash") and not (PIN_RE.match(pin) and check_password_hash(user["app_pin_hash"], pin)):
        return jsonify({"ok": False, "error": "wrong_pin"}), 401
    set_app_pin_hash(user_id, None)
    return jsonify({"ok": True})


@app.route("/api/load-state")
def api_load_state():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    if app_lock_blocks(user_id):
        return locked_response()
    state = load_user_state(user_id)
    return jsonify({"ok": True, "state": state})


@app.route("/api/save-state", methods=["POST"])
def api_save_state():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    if app_lock_blocks(user_id):
        return locked_response()
    data = request.get_json(force=True) or {}
    state = data.get("state")
    if state is None:
        return jsonify({"ok": False, "error": "Falta el state"}), 400
    save_user_state(user_id, state)
    try:
        referenced = set(DIARY_PHOTO_URL_RE.findall(json.dumps(state)))
        delete_unreferenced_diary_photos(user_id, referenced)
    except Exception as e:
        print(f"[diario] no se pudieron limpiar fotos viejas: {e}")
    return jsonify({"ok": True})


# ============================================================
# FOTOS DEL DIARIO — se suben una vez y el estado solo guarda su URL.
# ============================================================
DIARY_PHOTO_URL_RE = re.compile(r"/api/diary-photo/([A-Za-z0-9_-]+)")
DIARY_PHOTO_MAX_BYTES = 3 * 1024 * 1024
DIARY_PHOTO_DATA_URL_RE = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$")


@app.route("/api/diary-photo", methods=["POST"])
def api_upload_diary_photo():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    if app_lock_blocks(user_id):
        return locked_response()
    data_url = (request.get_json(force=True) or {}).get("dataUrl") or ""
    match = DIARY_PHOTO_DATA_URL_RE.match(data_url)
    if not match:
        return jsonify({"ok": False, "error": "Imagen inválida"}), 400
    mime, data_b64 = match.groups()
    try:
        size = len(base64.b64decode(data_b64, validate=True))
    except Exception:
        return jsonify({"ok": False, "error": "Imagen inválida"}), 400
    if size > DIARY_PHOTO_MAX_BYTES:
        return jsonify({"ok": False, "error": "Imagen demasiado grande"}), 413
    photo_id = save_diary_photo(user_id, mime, data_b64)
    return jsonify({"ok": True, "url": f"/api/diary-photo/{photo_id}"})


@app.route("/api/diary-photo/<photo_id>")
def api_get_diary_photo(photo_id):
    user_id = session.get("user_id")
    if not user_id:
        return "", 401
    if app_lock_blocks(user_id):
        return "", 423
    row = get_diary_photo(user_id, photo_id)
    if not row:
        return "", 404
    resp = Response(base64.b64decode(row["data_b64"]), mimetype=row["mime"])
    # El id cambia si cambia la foto, así que se puede guardar en caché.
    resp.headers["Cache-Control"] = "private, max-age=31536000, immutable"
    return resp


# ============================================================
# PLAN PREMIUM (Paddle Billing) — sin publicidad + métricas completas
# ============================================================
@app.route("/api/paddle-config")
def api_paddle_config():
    return jsonify({
        "clientToken": PADDLE_CLIENT_TOKEN or "",
        "priceId": PADDLE_PRICE_ID or "",
        "environment": PADDLE_ENV,
        "configured": paddle_configured(),
        "priceLabel": PADDLE_PRICE_LABEL,
    })


@app.route("/api/subscription-status")
def api_subscription_status():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    user = get_user(user_id)
    return jsonify({"ok": True, "premium": bool(user["is_premium"])})


@app.route("/api/cancel-subscription", methods=["POST"])
def api_cancel_subscription():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    user = get_user(user_id)
    subscription_id = user.get("paddle_subscription_id")
    if subscription_id and paddle_configured():
        # Se cancela al final del periodo ya pagado (no "immediately"): la
        # persona conserva Premium hasta esa fecha, y quien lo quita es el
        # webhook subscription.canceled que Paddle manda ese día.
        # Endpoint según https://developer.paddle.com/api-reference/subscriptions/cancel-subscription
        try:
            resp = requests.post(
                f"{PADDLE_API_BASE}/subscriptions/{subscription_id}/cancel",
                json={"effective_from": "next_billing_period"},
                headers=paddle_headers(),
                timeout=15,
            )
            ok = resp.status_code < 300
        except Exception as e:
            print(f"[paddle] error al cancelar: {e}")
            ok = False
        if not ok:
            # No quitamos Premium localmente: si Paddle no canceló, seguiría
            # cobrando y la persona creería que ya canceló.
            return jsonify({"ok": False, "error": "No se pudo cancelar en Paddle. Intenta de nuevo."}), 502
        return jsonify({"ok": True, "premium": True, "endsAtPeriodEnd": True})
    set_user_premium(user_id, False)
    return jsonify({"ok": True, "premium": False})


# ============================================================
# CHECKOUT DESDE LA APP NATIVA (Capacitor / Android) — el WebView de la app
# no comparte la sesión con el navegador del sistema, así que el pago se
# abre en el navegador del sistema con un token de un solo uso (mismo patrón
# que el login nativo de arriba). Al pagar, la página vuelve a la app por
# blesshabit://premium-done, y la app consulta /api/subscription-status.
# Quien activa el Premium de verdad sigue siendo el webhook de Paddle.
# ============================================================
@app.route("/api/native-checkout-token", methods=["POST"])
def api_native_checkout_token():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    token = create_one_time_token(user_id, "checkout", NATIVE_TOKEN_TTL_SECONDS)
    return jsonify({"ok": True, "url": url_for("native_checkout", token=token, _external=True)})


@app.route("/premium/native-checkout")
def native_checkout():
    """Se abre en el navegador del sistema (no en el WebView de la app)."""
    checkout_user_id = consume_one_time_token(request.args.get("token", ""), "checkout")
    error = None
    user = None
    if not checkout_user_id:
        error = "Este enlace de pago expiró. Vuelve a la app y toca de nuevo \"Hazte Premium\"."
    else:
        user = get_user(checkout_user_id)
        if not user:
            error = "No encontramos tu cuenta. Vuelve a la app e inicia sesión de nuevo."
        elif user["is_premium"]:
            error = "Ya tienes Bless Habit Premium activo. ¡Gracias!"
        elif not paddle_configured():
            error = "El cobro con Paddle todavía no está configurado en el servidor."
    return render_template(
        "native_checkout.html",
        error=error,
        email=(user["email"] if user else "") or "",
        client_token=PADDLE_CLIENT_TOKEN or "",
        price_id=PADDLE_PRICE_ID or "",
        paddle_env=PADDLE_ENV,
        price_label=PADDLE_PRICE_LABEL,
        return_url=f"{NATIVE_APP_URL_SCHEME}://premium-done",
    )


@app.route("/webhooks/paddle", methods=["POST"])
def webhook_paddle():
    # Paddle notifica aquí cada evento del ciclo de vida de la suscripción.
    # NOTA: no se pudo probar en vivo desde este entorno (sin salida a
    # internet) — la verificación de firma sí se probó de forma aislada
    # (generando una firma a mano con el mismo algoritmo). Antes de confiar
    # en esto en producción, prueba con un webhook real de Paddle (tienen un
    # botón de "enviar evento de prueba" en el dashboard).
    raw_body = request.get_data()
    signature = request.headers.get("Paddle-Signature", "")
    if not verify_paddle_webhook_signature(raw_body, signature, PADDLE_WEBHOOK_SECRET):
        return jsonify({"ok": False, "error": "Firma inválida"}), 401

    event = request.get_json(silent=True) or {}
    try:
        event_type = event.get("event_type", "")
        data = event.get("data", {}) or {}
        custom_data = data.get("custom_data") or {}
        customer_id = data.get("customer_id")
        subscription_id = data.get("id") if event_type.startswith("subscription.") else data.get("subscription_id")

        # Primero intenta correlacionar por el correo que mandamos como custom_data
        # al abrir el checkout (así funciona en la primera activación); si no,
        # cae a buscar por el customer_id o subscription_id que ya teníamos
        # guardados de una activación anterior (renovaciones, cancelaciones).
        user = None
        email = custom_data.get("app_user_email")
        if email:
            user = find_user_by_email(email)
        if not user and customer_id:
            user = find_user_by_paddle_customer(customer_id)
        if not user and subscription_id:
            user = find_user_by_paddle_subscription(subscription_id)

        if user:
            # subscription.updated llega tanto al activar como al cancelar/pausar,
            # así que lo que manda es el "status" actual de la suscripción.
            status = data.get("status") if event_type.startswith("subscription.") else None
            if event_type in ("subscription.canceled", "subscription.past_due", "subscription.paused"):
                set_user_premium(user["id"], False)
            elif event_type in ("subscription.created", "subscription.activated", "subscription.trialing", "subscription.resumed", "subscription.updated"):
                if status in (None, "active", "trialing"):
                    set_user_premium(user["id"], True, customer_id=customer_id, subscription_id=subscription_id)
                else:
                    set_user_premium(user["id"], False, customer_id=customer_id, subscription_id=subscription_id)
    except Exception as e:
        print(f"[paddle] error procesando webhook: {e}")
    return jsonify({"ok": True})


# ============================================================
# NOTIFICACIONES PUSH — rutas
# ============================================================
@app.route("/sw.js")
def service_worker():
    # Se sirve desde la raíz (no desde /static/) a propósito: el service worker solo
    # puede controlar páginas dentro de su mismo "scope", y la raíz cubre toda la app.
    js = """
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Bless Habit', body: event.data ? event.data.text() : '' }; }
  var title = data.title || 'Bless Habit';
  var options = { body: data.body || '', data: { url: data.url || '/' } };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
""".strip()
    return Response(js, mimetype="application/javascript")


@app.route("/api/push/vapid-public-key")
def api_push_vapid_public_key():
    return jsonify({"publicKey": VAPID_PUBLIC_KEY, "configured": push_configured()})


@app.route("/api/push/subscribe", methods=["POST"])
def api_push_subscribe():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    data = request.get_json(force=True) or {}
    sub = data.get("subscription") or {}
    endpoint = sub.get("endpoint")
    keys = sub.get("keys") or {}
    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        return jsonify({"ok": False, "error": "Suscripción incompleta"}), 400
    save_push_subscription(user_id, endpoint, keys["p256dh"], keys["auth"])
    return jsonify({"ok": True})


@app.route("/api/push/unsubscribe", methods=["POST"])
def api_push_unsubscribe():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    data = request.get_json(force=True) or {}
    endpoint = data.get("endpoint")
    if endpoint:
        remove_push_subscription(endpoint)
    return jsonify({"ok": True})


@app.route("/api/push/send-test", methods=["POST"])
def api_push_send_test():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    if not push_configured():
        return jsonify({"ok": False, "error": "VAPID no está configurado en el servidor (faltan VAPID_PRIVATE_KEY / VAPID_PUBLIC_KEY en Secrets)."}), 400
    result = send_push_to_user(user_id, "Bless Habit 🌱", "Esta es una notificación de prueba — si la ves, ¡ya quedó funcionando!")
    return jsonify(result)


@app.route("/api/push/send-reengagement", methods=["POST"])
def api_push_send_reengagement():
    # Pensada para que la dispare un cron externo (ej. cron-job.org, gratis) una vez al
    # día — Replit no corre tareas en segundo plano por sí solo sin un plan pagado. Se
    # protege con un secreto compartido en vez de sesión, porque quien la llama no es
    # una persona con sesión abierta, es un servicio externo.
    if not PUSH_BATCH_SECRET or request.headers.get("X-Push-Batch-Secret") != PUSH_BATCH_SECRET:
        return jsonify({"ok": False, "error": "No autorizado"}), 401
    if not push_configured():
        return jsonify({"ok": False, "error": "VAPID no configurado"}), 400
    days = int(request.args.get("days", 3))
    import random
    candidates = get_inactive_users_with_push(days)
    sent = 0
    for c in candidates:
        msg = random.choice(REENGAGE_PUSH_MESSAGES)
        send_push_to_user(c["user_id"], "Bless Habit 🤍", msg)
        sent += 1
    return jsonify({"ok": True, "usuariosNotificados": sent})


# ============================================================
# RUTAS DE LA APP
# ============================================================
@app.route("/")
def index():
    return render_template(
        "index.html",
        adsense_client_id=ADSENSE_CLIENT_ID,
        adsense_slot_id=ADSENSE_SLOT_ID,
        paddle_price_label=PADDLE_PRICE_LABEL,
        native_app_url_scheme=NATIVE_APP_URL_SCHEME,
    )


@app.route("/healthz")
def healthz():
    # Para un servicio externo gratis (ej. cron-job.org) que lo visite cada 10
    # minutos y así Render no "duerma" el servidor. No toca la base de datos.
    return "ok"


@app.route("/api/status")
def status():
    return jsonify({
        "aiReady": bool(os.environ.get("OPENAI_API_KEY")),
        # Si esto sale en False en producción, los datos NO sobreviven a que el
        # servidor se duerma/reinicie — faltan TURSO_DATABASE_URL/TURSO_AUTH_TOKEN.
        "dbPersistent": USE_TURSO,
    })


@app.route("/api/check-ai")
def check_ai():
    """Diagnóstico: abre /api/check-ai en el navegador (con sesión iniciada)
    para ver si la IA responde y, si no, el motivo exacto (key, saldo, modelo)."""
    if not session.get("user_id"):
        return jsonify({"ok": False, "error": "Inicia sesión en la app primero y vuelve a abrir esta página."}), 401
    try:
        client = get_client()
        if client is None:
            return jsonify({"ok": False, "model": OPENAI_MODEL, "error": "Falta OPENAI_API_KEY en Render → Environment."})
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": "Responde solo: funciona"}],
            max_tokens=5,
        )
        return jsonify({"ok": True, "model": OPENAI_MODEL, "reply": resp.choices[0].message.content})
    except Exception as e:
        return jsonify({"ok": False, "model": OPENAI_MODEL, "error": str(e)})


@app.route("/api/bless-reply", methods=["POST"])
def bless_reply():
    # Solo para usuarios con sesión: si no, cualquiera en internet podría usar
    # este endpoint y gastar tu saldo de OpenAI.
    if not session.get("user_id"):
        return jsonify({"ok": False, "reply": None, "error": "No autenticado"}), 401
    if app_lock_blocks(session["user_id"]):
        return locked_response()
    data = request.get_json(force=True) or {}
    # Compatibilidad con el formato viejo (solo "prompt") y el nuevo, que separa
    # el prompt de sistema (persona de Bless) del historial real de la conversación,
    # para que el modelo tenga memoria de lo que ya se dijo y no responda cada
    # mensaje como si fuera aislado.
    system_prompt = (data.get("system") or "").strip()
    history = data.get("history") or []
    prompt = (data.get("prompt") or "").strip()

    try:
        client = get_client()
    except Exception as e:
        print(f"[openai] no se pudo crear el cliente: {e}")
        return jsonify({"ok": False, "reply": None, "error": str(e)}), 500
    if client is None:
        return jsonify({
            "ok": False,
            "reply": None,
            "error": "No hay OPENAI_API_KEY configurada en el servidor (agrégala en Secrets)."
        }), 400

    if not prompt and not system_prompt:
        return jsonify({"ok": False, "reply": None, "error": "Falta el prompt."}), 400

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if isinstance(history, list):
        for turn in history[-12:]:
            if not isinstance(turn, dict):
                continue
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)})
    if prompt:
        messages.append({"role": "user", "content": prompt})

    if not messages:
        return jsonify({"ok": False, "reply": None, "error": "Falta el prompt."}), 400

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            temperature=0.9,
            max_tokens=150,
        )
        reply = resp.choices[0].message.content
        return jsonify({"ok": True, "reply": reply.strip() if reply else None})
    except Exception as e:
        # Visible en Render → Logs: así se ve si falla la key, el saldo o el modelo.
        print(f"[openai] error en /api/bless-reply: {e}")
        return jsonify({"ok": False, "reply": None, "error": str(e)}), 500


# ============================================================
# RECUERDOS DE BLESS — el chat visible dura un día; al empezar un día nuevo,
# la conversación anterior se resume en unas pocas notas ("terminó con su
# novio el 3 de oct", "quiere retomar la guitarra") y los mensajes completos
# se descartan. La persona ve y borra esas notas en Perfil.
# ============================================================
MAX_MEMORIES = 12


@app.route("/api/bless-memories", methods=["POST"])
def bless_memories():
    if not session.get("user_id"):
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    if app_lock_blocks(session["user_id"]):
        return locked_response()
    data = request.get_json(force=True) or {}
    lang = "inglés" if data.get("language") == "en" else "español"
    date = str(data.get("date") or "")[:10]
    existing = [str(m)[:200] for m in (data.get("memories") or []) if m][:MAX_MEMORIES]
    messages = []
    for m in (data.get("messages") or [])[-60:]:
        if isinstance(m, dict) and m.get("text"):
            who = "Persona" if m.get("who") == "user" else "Bless"
            messages.append(f"{who}: {str(m['text'])[:600]}")
    if not messages:
        return jsonify({"ok": True, "memories": existing})
    try:
        client = get_client()
    except Exception as e:
        print(f"[openai] no se pudo crear el cliente: {e}")
        client = None
    if client is None:
        return jsonify({"ok": False, "error": "IA no disponible"}), 503
    instructions = (
        f"Eres la memoria de Bless, una app de hábitos que acompaña como una amiga. "
        f"Actualiza la lista de recuerdos sobre la persona a partir de la conversación del {date}. "
        f"Guarda solo lo que sirva para acompañarla mejor en los próximos días: sucesos importantes de su vida "
        f"(con la fecha escrita de forma natural si importa, por ejemplo 'el 2 de oct'), cómo se siente si es relevante, metas, gustos y lo que le funciona o no con sus hábitos. "
        f"No guardes saludos, cosas triviales, ni datos sensibles innecesarios (números, direcciones, contraseñas, salud detallada). "
        f"Une recuerdos repetidos, quita los que ya no apliquen y conserva los anteriores que sigan siendo útiles. "
        f"Máximo {MAX_MEMORIES} recuerdos, cada uno de una frase corta (menos de 120 caracteres), en {lang}, en tercera persona. "
        f'Responde SOLO con JSON: {{"memories": ["...", "..."]}}'
    )
    user_content = "Recuerdos actuales:\n" + ("\n".join(f"- {m}" for m in existing) or "(ninguno)") + \
        "\n\nConversación:\n" + "\n".join(messages)
    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": instructions}, {"role": "user", "content": user_content}],
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(resp.choices[0].message.content or "{}")
        memories = [str(m).strip()[:200] for m in parsed.get("memories", []) if str(m).strip()][:MAX_MEMORIES]
        return jsonify({"ok": True, "memories": memories})
    except Exception as e:
        print(f"[openai] error en /api/bless-memories: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
