import os
import json
import sqlite3
import hmac
import hashlib
import time
import secrets
import requests
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, Response
from openai import OpenAI
from authlib.integrations.flask_client import OAuth
from pywebpush import webpush, WebPushException

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-cambia-esto-en-produccion")

# ============================================================
# OPENAI — la key vive SOLO en el servidor (Replit Secrets).
# ============================================================
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def get_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
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
# BASE DE DATOS (SQLite) — perfil, hábitos, agenda e historial por usuario
# ============================================================
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bless_habit.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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
    # Migración suave: agrega columnas nuevas si la base ya existía sin ellas
    # (por ejemplo una base creada antes de Premium, o todavía con las
    # columnas viejas de Culqi de una versión anterior de este archivo).
    existing_cols = {row["name"] for row in conn.execute("PRAGMA table_info(users)")}
    for col, ddl in [
        ("is_premium", "ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0"),
        ("paddle_customer_id", "ALTER TABLE users ADD COLUMN paddle_customer_id TEXT"),
        ("paddle_subscription_id", "ALTER TABLE users ADD COLUMN paddle_subscription_id TEXT"),
        ("premium_since", "ALTER TABLE users ADD COLUMN premium_since TEXT"),
    ]:
        if col not in existing_cols:
            conn.execute(ddl)
    conn.commit()
    conn.close()


init_db()


def get_or_create_user(google_id, email, name, picture):
    conn = get_db()
    row = conn.execute("SELECT id FROM users WHERE google_id = ?", (google_id,)).fetchone()
    if row:
        user_id = row["id"]
        conn.execute("UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?", (email, name, picture, user_id))
    else:
        cur = conn.execute(
            "INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)",
            (google_id, email, name, picture),
        )
        user_id = cur.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_user(user_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def find_user_by_email(email):
    if not email:
        return None
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def load_user_state(user_id):
    conn = get_db()
    row = conn.execute("SELECT state_json FROM user_state WHERE user_id = ?", (user_id,)).fetchone()
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


def find_user_by_paddle_customer(customer_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE paddle_customer_id = ?", (customer_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def find_user_by_paddle_subscription(subscription_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE paddle_subscription_id = ?", (subscription_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


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
    rows = conn.execute("SELECT * FROM push_subscriptions WHERE user_id = ?", (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_inactive_users_with_push(days_inactive):
    """Usuarios con al menos una suscripción push, cuyo estado no se actualiza hace
    `days_inactive` días o más (candidatos al mensaje de reenganche compasivo)."""
    conn = get_db()
    rows = conn.execute("""
        SELECT DISTINCT u.id as user_id, u.name
        FROM users u
        JOIN push_subscriptions ps ON ps.user_id = u.id
        JOIN user_state us ON us.user_id = u.id
        WHERE datetime(us.updated_at) <= datetime('now', ?)
    """, (f"-{int(days_inactive)} days",)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


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
# En memoria alcanza: son tokens de un solo uso que expiran en 2 minutos.
# ============================================================
NATIVE_LOGIN_TOKENS = {}
NATIVE_LOGIN_TOKEN_TTL_SECONDS = 120
NATIVE_APP_URL_SCHEME = os.environ.get("NATIVE_APP_URL_SCHEME", "blesshabit")


def _cleanup_native_login_tokens():
    now = time.time()
    expired = [t for t, (_, exp) in NATIVE_LOGIN_TOKENS.items() if exp < now]
    for t in expired:
        NATIVE_LOGIN_TOKENS.pop(t, None)


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
    redirect_uri = url_for("auth_callback", _external=True)
    return google.authorize_redirect(redirect_uri)


@app.route("/auth/callback")
def auth_callback():
    token = google.authorize_access_token()
    userinfo = token.get("userinfo")
    if not userinfo:
        return "No se pudo confirmar tu cuenta de Google. Intenta iniciar sesión de nuevo.", 400
    user_id = get_or_create_user(
        google_id=userinfo["sub"],
        email=userinfo.get("email"),
        name=userinfo.get("name"),
        picture=userinfo.get("picture"),
    )
    session["user_id"] = user_id
    if session.pop("native_login", False):
        _cleanup_native_login_tokens()
        exchange_token = secrets.token_urlsafe(32)
        NATIVE_LOGIN_TOKENS[exchange_token] = (user_id, time.time() + NATIVE_LOGIN_TOKEN_TTL_SECONDS)
        return redirect(f"{NATIVE_APP_URL_SCHEME}://auth-callback?token={exchange_token}")
    return redirect("/")


@app.route("/auth/native-exchange")
def auth_native_exchange():
    """La app nativa llama esto DESDE SU PROPIO WebView (no desde el navegador
    del sistema) con el token que recibió por el enlace personalizado, para
    obtener su propia cookie de sesión."""
    _cleanup_native_login_tokens()
    token = request.args.get("token", "")
    entry = NATIVE_LOGIN_TOKENS.pop(token, None)
    if not entry:
        return "Enlace de acceso inválido o expirado. Intenta iniciar sesión de nuevo.", 400
    user_id, expires_at = entry
    if expires_at < time.time():
        return "El enlace de acceso expiró. Intenta iniciar sesión de nuevo.", 400
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
    })


@app.route("/api/load-state")
def api_load_state():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    state = load_user_state(user_id)
    return jsonify({"ok": True, "state": state})


@app.route("/api/save-state", methods=["POST"])
def api_save_state():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "No autenticado"}), 401
    data = request.get_json(force=True) or {}
    state = data.get("state")
    if state is None:
        return jsonify({"ok": False, "error": "Falta el state"}), 400
    save_user_state(user_id, state)
    return jsonify({"ok": True})


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
        try:
            # NOTA: no se pudo confirmar en vivo el endpoint exacto de cancelar
            # (sin salida a internet en este entorno). Según la documentación de
            # Paddle Billing es POST /subscriptions/{id}/cancel — verifica esto
            # contra https://developer.paddle.com/api-reference/subscriptions/cancel-subscription
            # antes de depender de esto en producción.
            requests.post(
                f"{PADDLE_API_BASE}/subscriptions/{subscription_id}/cancel",
                json={"effective_from": "immediately"},
                headers=paddle_headers(),
                timeout=15,
            )
        except Exception as e:
            print(f"[paddle] no se pudo cancelar en Paddle (se quita Premium localmente igual): {e}")
    set_user_premium(user_id, False)
    return jsonify({"ok": True})


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
            if event_type in ("subscription.canceled", "subscription.past_due", "subscription.paused"):
                set_user_premium(user["id"], False)
            elif event_type in ("subscription.created", "subscription.activated", "subscription.trialing", "subscription.resumed", "subscription.updated"):
                set_user_premium(user["id"], True, customer_id=customer_id, subscription_id=subscription_id)
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


@app.route("/api/status")
def status():
    return jsonify({"aiReady": bool(os.environ.get("OPENAI_API_KEY"))})


@app.route("/api/bless-reply", methods=["POST"])
def bless_reply():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")

    client = get_client()
    if client is None:
        return jsonify({
            "ok": False,
            "reply": None,
            "error": "No hay OPENAI_API_KEY configurada en el servidor (agrégala en Secrets)."
        }), 400

    if not prompt:
        return jsonify({"ok": False, "reply": None, "error": "Falta el prompt."}), 400

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.85,
            max_tokens=150,
        )
        reply = resp.choices[0].message.content
        return jsonify({"ok": True, "reply": reply.strip() if reply else None})
    except Exception as e:
        return jsonify({"ok": False, "reply": None, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
