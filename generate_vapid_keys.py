"""
Genera un par de claves VAPID nuevo para las notificaciones push de Bless Habit.

Cómo usarlo (una sola vez, antes de activar notificaciones):
  1. En la terminal de Replit (o donde tengas este proyecto), corre:
       python3 generate_vapid_keys.py
  2. Copia los dos valores que imprime a Secrets:
       VAPID_PRIVATE_KEY  -> una sola línea en base64url (SIN -----BEGIN/END-----)
       VAPID_PUBLIC_KEY   -> la cadena corta en base64url
  3. No compartas VAPID_PRIVATE_KEY con nadie ni lo subas a un repositorio público.
"""
import base64
from py_vapid import Vapid02
from cryptography.hazmat.primitives import serialization

v = Vapid02()
v.generate_keys()

# La librería pywebpush (webpush()) espera vapid_private_key como un string en
# base64url SIN encabezados PEM: internamente hace
#   key_bytes = b64urldecode(private_key.encode().replace(b"\n", b""))
# y si no son 32 bytes crudos, lo interpreta como DER (PKCS8). Por eso acá
# serializamos a DER/PKCS8 y lo codificamos en base64url, en vez de usar
# v.private_pem() (que es un bloque PEM y NO funciona con esta librería).
private_der = v.private_key.private_bytes(
    encoding=serialization.Encoding.DER,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
private_b64 = base64.urlsafe_b64encode(private_der).decode().rstrip("=")

public_raw = v.public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint,
)
public_b64 = base64.urlsafe_b64encode(public_raw).decode().rstrip("=")

print("=" * 60)
print("VAPID_PRIVATE_KEY  (pégalo tal cual, en una sola línea, en Secrets):")
print(private_b64)
print("VAPID_PUBLIC_KEY  (pégalo en Secrets):")
print(public_b64)
print("=" * 60)
