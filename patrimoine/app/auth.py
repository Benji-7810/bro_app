"""
Connexion au site.

Un seul compte : le tien. Le mot de passe n'est jamais stocké en clair,
seul un hash PBKDF2-SHA256 salé est gardé en base.

La session tient dans un cookie signé (HMAC) : rien à stocker côté
serveur et tu restes connecté après un redémarrage. Changer le mot de
passe fait tourner la clé de signature, ce qui invalide d'un coup
toutes les sessions ouvertes ailleurs.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time

from . import db

COOKIE = "forge_session"
DUREE_SESSION = 30 * 24 * 3600      # 30 jours
ITERATIONS = 240_000
LONGUEUR_MINI = 8


# ---------------------------------------------------------------- identifiants
def _hacher(motdepasse: str, sel: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", motdepasse.encode(), sel, ITERATIONS)


def configure() -> bool:
    """Le compte a-t-il déjà été créé ?"""
    return bool(db.config_lire("auth_hash"))


def utilisateur() -> str:
    return db.config_lire("auth_utilisateur") or ""


def definir_identifiants(nom: str, motdepasse: str) -> None:
    sel = secrets.token_bytes(16)
    db.config_ecrire("auth_utilisateur", nom.strip())
    db.config_ecrire("auth_sel", sel.hex())
    db.config_ecrire("auth_hash", _hacher(motdepasse, sel).hex())
    # Nouvelle clé de signature : les anciennes sessions tombent.
    db.config_ecrire("session_secret", secrets.token_hex(32))


def verifier(nom: str, motdepasse: str) -> bool:
    attendu = db.config_lire("auth_hash")
    sel = db.config_lire("auth_sel")
    if not attendu or not sel:
        return False
    bon_nom = hmac.compare_digest(
        utilisateur().strip().lower().encode(), nom.strip().lower().encode()
    )
    bon_mdp = hmac.compare_digest(
        bytes.fromhex(attendu), _hacher(motdepasse, bytes.fromhex(sel))
    )
    return bon_nom and bon_mdp


# -------------------------------------------------------------------- session
def _secret() -> bytes:
    s = db.config_lire("session_secret")
    if not s:
        s = secrets.token_hex(32)
        db.config_ecrire("session_secret", s)
    return bytes.fromhex(s)


def _signer(charge: bytes) -> bytes:
    return base64.urlsafe_b64encode(
        hmac.new(_secret(), charge, hashlib.sha256).digest()
    ).rstrip(b"=")


def creer_session() -> str:
    corps = json.dumps({"exp": int(time.time()) + DUREE_SESSION}).encode()
    charge = base64.urlsafe_b64encode(corps).rstrip(b"=")
    return f"{charge.decode()}.{_signer(charge).decode()}"


def session_valide(jeton: str | None) -> bool:
    if not jeton or "." not in jeton:
        return False
    charge, _, signature = jeton.partition(".")
    if not hmac.compare_digest(signature.encode(), _signer(charge.encode())):
        return False
    try:
        corps = json.loads(base64.urlsafe_b64decode(charge + "=" * (-len(charge) % 4)))
    except ValueError:
        return False
    return corps.get("exp", 0) > time.time()
