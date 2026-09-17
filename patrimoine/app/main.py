"""
Serveur du tableau de bord.

    uvicorn app.main:app --reload

Il sert la page ET l'API. Le front n'appelle plus que ce serveur,
donc plus aucun problème de CORS : c'est ici que les appels sortants
partent, avec les clés qui restent sur ta machine.
"""
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import auth, collecte, db, iestims

load_dotenv()
STATIC = Path(__file__).parent / "static"
planif = AsyncIOScheduler(timezone="Europe/Paris")


def _min(cle, defaut):
    try:
        return max(1, int(os.getenv(cle, defaut)))
    except ValueError:
        return defaut


@asynccontextmanager
async def cycle(app: FastAPI):
    db.init()
    planif.add_job(collecte.collecte_crypto, "interval", minutes=_min("INTERVAL_CRYPTO", 5), id="crypto")
    planif.add_job(collecte.collecte_bourse, "interval", minutes=_min("INTERVAL_BOURSE", 30), id="bourse")
    planif.add_job(collecte.collecte_cartes, "interval", minutes=_min("INTERVAL_CARTES", 360), id="cartes")
    planif.add_job(collecte.collecte_banque, "interval", minutes=_min("INTERVAL_BANQUE", 720), id="banque")
    planif.start()
    await collecte.collecte_crypto()      # premier remplissage immédiat
    await collecte.collecte_bourse()
    yield
    planif.shutdown(wait=False)


app = FastAPI(title="Patrimoine", lifespan=cycle)


# ------------------------------------------------------------------ connexion
# Seules ces routes répondent sans cookie de session : tout le reste du
# site (accueil, chapitres, dashboard, API) est derrière la connexion.
LIBRES = {"/connexion", "/api/connexion", "/api/etat-connexion"}


@app.middleware("http")
async def garde(request: Request, call_next):
    if request.url.path in LIBRES or auth.session_valide(request.cookies.get(auth.COOKIE)):
        return await call_next(request)
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": "Session expirée"}, status_code=401)
    return RedirectResponse("/connexion", status_code=302)


def _reponse_connectee(charge):
    r = JSONResponse(charge)
    r.set_cookie(auth.COOKIE, auth.creer_session(), httponly=True,
                 samesite="lax", max_age=auth.DUREE_SESSION, path="/")
    return r


@app.get("/connexion")
async def page_connexion():
    return FileResponse(STATIC / "connexion.html")


@app.get("/api/etat-connexion")
async def etat_connexion():
    return {"configure": auth.configure(), "utilisateur": auth.utilisateur()}


class Identifiants(BaseModel):
    utilisateur: str
    motdepasse: str


@app.post("/api/connexion")
async def connexion(i: Identifiants):
    if not auth.configure():
        if not i.utilisateur.strip():
            raise HTTPException(400, "Choisis un identifiant.")
        if len(i.motdepasse) < auth.LONGUEUR_MINI:
            raise HTTPException(400, f"Mot de passe : {auth.LONGUEUR_MINI} caractères minimum.")
        auth.definir_identifiants(i.utilisateur, i.motdepasse)
    elif not auth.verifier(i.utilisateur, i.motdepasse):
        raise HTTPException(401, "Identifiant ou mot de passe incorrect.")
    return _reponse_connectee({"ok": True})


@app.post("/api/deconnexion")
async def deconnexion():
    r = JSONResponse({"ok": True})
    r.delete_cookie(auth.COOKIE, path="/")
    return r


class Motdepasse(BaseModel):
    actuel: str
    nouveau: str


@app.post("/api/motdepasse")
async def changer_motdepasse(m: Motdepasse):
    if not auth.verifier(auth.utilisateur(), m.actuel):
        raise HTTPException(401, "Mot de passe actuel incorrect.")
    if len(m.nouveau) < auth.LONGUEUR_MINI:
        raise HTTPException(400, f"Mot de passe : {auth.LONGUEUR_MINI} caractères minimum.")
    auth.definir_identifiants(auth.utilisateur(), m.nouveau)
    # La clé de signature a tourné : on re-signe la session courante.
    return _reponse_connectee({"ok": True})


# ------------------------------------------------------------------ lecture
@app.get("/api/portefeuille")
async def portefeuille():
    p = db.portefeuille()
    p["sources"] = db.sante()
    p["prochaines"] = {j.id: j.next_run_time.isoformat(timespec="seconds")
                       for j in planif.get_jobs() if j.next_run_time}
    return p


@app.get("/api/historique")
async def historique(heures: int = 8760, points: int = 60):
    return db.historique(heures, points)


@app.get("/api/ligne/{ligne_id}/historique")
async def historique_ligne(ligne_id: str, heures: int = 8760):
    from datetime import datetime, timedelta
    depuis = (datetime.now() - timedelta(hours=heures)).isoformat()
    with db.cx() as c:
        rows = c.execute(
            "SELECT horodate, valeur FROM releves WHERE ligne_id = ? AND horodate >= ? ORDER BY horodate",
            (ligne_id, depuis)).fetchall()
    return [{"t": r["horodate"], "v": r["valeur"]} for r in rows]


# ------------------------------------------------------------------ actions
@app.post("/api/collecter")
async def collecter(quoi: str = "tout"):
    fn = {"crypto": collecte.collecte_crypto, "bourse": collecte.collecte_bourse,
          "cartes": collecte.collecte_cartes, "banque": collecte.collecte_banque,
          "tout": collecte.tout_collecter}.get(quoi)
    if not fn:
        raise HTTPException(400, "cible inconnue")
    await fn()
    return db.portefeuille()


CATEGORIES = {"invest", "crypto", "pokemon", "montre", "courant", "epargne"}


class CompteEntree(BaseModel):
    nom: str
    categorie: str
    institution: str | None = None


@app.post("/api/compte")
async def creer_compte(e: CompteEntree):
    if e.categorie not in CATEGORIES:
        raise HTTPException(400, f"Catégorie inconnue : {e.categorie}")
    if not e.nom.strip():
        raise HTTPException(400, "Donne un nom au compte.")
    cid = "c" + uuid.uuid4().hex[:10]
    db.upsert_compte(cid, e.nom.strip(), e.categorie, e.institution,
                     ordre=len(db.lister_comptes()) + 1)
    return {"id": cid}


@app.delete("/api/compte/{compte_id}")
async def effacer_compte(compte_id: str):
    db.supprimer_compte(compte_id)
    return {"ok": True}


class LigneEntree(BaseModel):
    compte_id: str
    nom: str
    sous_titre: str | None = None
    quantite: float = 1
    prix_unite: float = 0
    investi: float = 0
    source: str = "manuel"
    code: str | None = None
    image: str | None = None
    style: str | None = None


@app.post("/api/ligne")
async def creer_ligne(e: LigneEntree):
    lid = "u" + uuid.uuid4().hex[:10]
    db.upsert_ligne(lid, **e.model_dump())
    db.enregistrer_releve()
    return {"id": lid}


class LigneMaj(BaseModel):
    quantite: float | None = None
    prix_unite: float | None = None
    investi: float | None = None
    code: str | None = None
    source: str | None = None
    image: str | None = None


@app.patch("/api/ligne/{ligne_id}")
async def modifier_ligne(ligne_id: str, m: LigneMaj):
    champs = {k: v for k, v in m.model_dump().items() if v is not None}
    if champs:
        db.maj_ligne(ligne_id, **champs)
        db.enregistrer_releve()
    return {"ok": True}


@app.delete("/api/ligne/{ligne_id}")
async def effacer_ligne(ligne_id: str):
    db.supprimer_ligne(ligne_id)
    return {"ok": True}


# ------------------------------------------------------------------ import
class ImportCsv(BaseModel):
    contenu: str
    compte_id: str | None = None


@app.post("/api/import/iestims")
async def import_iestims(i: ImportCsv):
    cid = i.compte_id
    if not cid:
        cpt = next((c for c in db.lister_comptes() if c["categorie"] == "pokemon"), None)
        cid = cpt["id"] if cpt else "c" + uuid.uuid4().hex[:10]
        if not cpt:
            db.upsert_compte(cid, "Collection Pokémon", "pokemon", "iEstims",
                             ordre=len(db.lister_comptes()) + 1)
    try:
        return await iestims.importer(i.contenu, cid)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ------------------------------------------------------------------ recherche
@app.get("/api/recherche/cartes")
async def rech_cartes(nom: str):
    try:
        return {"resultats": await collecte.chercher_cartes(nom)}
    except Exception as e:
        raise HTTPException(502, f"{type(e).__name__}: {e}" if str(e) else type(e).__name__)


@app.get("/api/recherche/scelle")
async def rech_scelle(terme: str):
    return await collecte.chercher_scelle(terme)


@app.get("/api/recherche/crypto")
async def rech_crypto(terme: str):
    try:
        return {"resultats": await collecte.chercher_crypto(terme)}
    except Exception as e:
        raise HTTPException(502, f"CoinGecko injoignable : {e}")


@app.get("/api/recherche/bourse")
async def rech_bourse(terme: str):
    try:
        return {"resultats": await collecte.chercher_bourse(terme)}
    except Exception as e:
        raise HTTPException(502, f"Yahoo Finance injoignable : {e}")


# ------------------------------------------------------------------ banque
@app.get("/api/banques")
async def banques(pays: str = "fr"):
    return await collecte.banques_disponibles(pays)


@app.post("/api/banque/consentement")
async def consentement(institution_id: str, redirection: str = "http://127.0.0.1:8000/retour"):
    return await collecte.demander_consentement(institution_id, redirection)


@app.get("/retour")
async def retour(ref: str = "", error: str = ""):
    """Page d'atterrissage après authentification chez la banque."""
    return FileResponse(STATIC / "retour.html")


@app.post("/api/banque/rattacher")
async def rattacher(requisition_id: str):
    return await collecte.rattacher_requisition(requisition_id)


# ------------------------------------------------------------------ statique
app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
