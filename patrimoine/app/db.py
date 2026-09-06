"""
Stockage SQLite du patrimoine.

Trois tables :
  comptes   — les enveloppes (PEA, Kraken, LCL, collection…)
  lignes    — ce qu'il y a dedans, avec quantité et prix unitaire
  releves   — un point d'historique par ligne et par collecte

L'historique est la vraie valeur ajoutée du backend : à partir du
deuxième jour, les courbes du site ne sont plus des formes
inventées mais tes valorisations réelles.
"""
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

CHEMIN = Path(__file__).parent.parent / "data.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS comptes (
    id          TEXT PRIMARY KEY,
    nom         TEXT NOT NULL,
    institution TEXT,
    categorie   TEXT NOT NULL,      -- invest | crypto | pokemon | montre | courant | epargne
    source      TEXT,               -- kraken | gocardless | manuel
    ref_externe TEXT,               -- id de compte chez la source
    ordre       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lignes (
    id          TEXT PRIMARY KEY,
    compte_id   TEXT NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
    nom         TEXT NOT NULL,
    sous_titre  TEXT,
    quantite    REAL DEFAULT 1,
    prix_unite  REAL DEFAULT 0,     -- dernier cours connu, en euros
    investi     REAL DEFAULT 0,     -- prix de revient total
    source      TEXT,               -- kraken | yfinance | coingecko | pokemontcg | tcgapi | manuel
    code        TEXT,               -- ETH, PUST.PA, ethereum, xy7-54, idProduct…
    image       TEXT,
    style       TEXT,               -- pour les visuels (montres, scellé)
    maj         TEXT,               -- horodatage du dernier cours
    etat        TEXT DEFAULT 'ok'   -- ok | erreur | manuel
);

CREATE TABLE IF NOT EXISTS releves (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ligne_id  TEXT NOT NULL REFERENCES lignes(id) ON DELETE CASCADE,
    horodate  TEXT NOT NULL,
    valeur    REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_releves ON releves(ligne_id, horodate);
-- un seul relevé par ligne et par horodate : sans ça, deux serveurs
-- lancés en parallèle doublaient les points et faussaient les courbes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_releves_uniq ON releves(ligne_id, horodate);

CREATE TABLE IF NOT EXISTS journal (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    horodate TEXT NOT NULL,
    source   TEXT NOT NULL,
    etat     TEXT NOT NULL,         -- ok | erreur | ignore
    detail   TEXT
);
"""


@contextmanager
def cx():
    c = sqlite3.connect(CHEMIN)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys = ON")
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    with cx() as c:
        # Dédoublonnage avant de poser l'index unique (migration des bases
        # existantes où des points en double se sont glissés).
        c.execute(
            """DELETE FROM releves WHERE id NOT IN (
                 SELECT MIN(id) FROM releves GROUP BY ligne_id, horodate)"""
        )
        c.executescript(SCHEMA)
    if not lister_comptes():
        _amorcer()


# ------------------------------------------------------------------ lecture
def lister_comptes():
    with cx() as c:
        return [dict(r) for r in c.execute("SELECT * FROM comptes ORDER BY ordre, nom")]


def lister_lignes(compte_id=None):
    q = "SELECT * FROM lignes"
    p = ()
    if compte_id:
        q += " WHERE compte_id = ?"
        p = (compte_id,)
    with cx() as c:
        return [dict(r) for r in c.execute(q, p)]


def portefeuille():
    """Structure complète prête à être envoyée au front."""
    comptes = lister_comptes()
    lignes = lister_lignes()
    par_compte = {}
    for l in lignes:
        l["valeur"] = round((l["quantite"] or 0) * (l["prix_unite"] or 0), 2)
        par_compte.setdefault(l["compte_id"], []).append(l)
    for c in comptes:
        c["lignes"] = sorted(par_compte.get(c["id"], []), key=lambda x: -x["valeur"])
        c["valeur"] = round(sum(l["valeur"] for l in c["lignes"]), 2)
        c["investi"] = round(sum(l["investi"] or 0 for l in c["lignes"]), 2)
    comptes.sort(key=lambda c: -c["valeur"])
    return {
        "comptes": comptes,
        "total": round(sum(c["valeur"] for c in comptes), 2),
        "investi": round(sum(c["investi"] for c in comptes), 2),
        "maj": datetime.now().isoformat(timespec="seconds"),
    }


def historique(heures=8760, points=60):
    """Somme du patrimoine sur la fenêtre demandée, rééchantillonnée."""
    depuis = (datetime.now() - timedelta(hours=heures)).isoformat()
    with cx() as c:
        brut = c.execute(
            """SELECT horodate, SUM(valeur) AS v FROM releves
               WHERE horodate >= ? GROUP BY horodate ORDER BY horodate""",
            (depuis,),
        ).fetchall()
    serie = [{"t": r["horodate"], "v": round(r["v"], 2)} for r in brut]
    if len(serie) <= points:
        return serie
    pas = len(serie) / points
    return [serie[min(len(serie) - 1, int(i * pas))] for i in range(points)]


def sante():
    with cx() as c:
        rows = c.execute(
            """SELECT source, etat, detail, MAX(horodate) AS horodate
               FROM journal GROUP BY source"""
        ).fetchall()
    return [dict(r) for r in rows]


# ------------------------------------------------------------------ écriture
def maj_ligne(ligne_id, **champs):
    if not champs:
        return
    sets = ", ".join(f"{k} = ?" for k in champs)
    with cx() as c:
        c.execute(f"UPDATE lignes SET {sets} WHERE id = ?", (*champs.values(), ligne_id))


def maj_cours(ligne_id, prix_unite, quantite=None):
    champs = {"prix_unite": prix_unite, "maj": datetime.now().isoformat(timespec="seconds"), "etat": "ok"}
    if quantite is not None:
        champs["quantite"] = quantite
    maj_ligne(ligne_id, **champs)


def upsert_compte(id, nom, categorie, institution=None, source="manuel", ref_externe=None, ordre=0):
    with cx() as c:
        c.execute(
            """INSERT INTO comptes (id, nom, institution, categorie, source, ref_externe, ordre)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET nom=excluded.nom, institution=excluded.institution,
                 categorie=excluded.categorie, source=excluded.source, ref_externe=excluded.ref_externe""",
            (id, nom, institution, categorie, source, ref_externe, ordre),
        )


def upsert_ligne(id, compte_id, nom, **champs):
    base = dict(sous_titre=None, quantite=1, prix_unite=0, investi=0,
                source="manuel", code=None, image=None, style=None, etat="manuel")
    base.update(champs)
    with cx() as c:
        c.execute(
            """INSERT INTO lignes (id, compte_id, nom, sous_titre, quantite, prix_unite,
                                   investi, source, code, image, style, etat)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET nom=excluded.nom, sous_titre=excluded.sous_titre,
                 quantite=excluded.quantite, prix_unite=excluded.prix_unite, investi=excluded.investi,
                 source=excluded.source, code=excluded.code, image=excluded.image, style=excluded.style""",
            (id, compte_id, nom, base["sous_titre"], base["quantite"], base["prix_unite"],
             base["investi"], base["source"], base["code"], base["image"], base["style"], base["etat"]),
        )


def supprimer_ligne(ligne_id):
    with cx() as c:
        c.execute("DELETE FROM lignes WHERE id = ?", (ligne_id,))


def enregistrer_releve():
    """Photographie la valeur de chaque ligne. Appelé après chaque collecte."""
    t = datetime.now().isoformat(timespec="minutes")
    with cx() as c:
        c.execute(
            """INSERT OR IGNORE INTO releves (ligne_id, horodate, valeur)
               SELECT id, ?, ROUND(quantite * prix_unite, 2) FROM lignes""",
            (t,),
        )


def journaliser(source, etat, detail=""):
    with cx() as c:
        c.execute(
            "INSERT INTO journal (horodate, source, etat, detail) VALUES (?,?,?,?)",
            (datetime.now().isoformat(timespec="seconds"), source, etat, str(detail)[:400]),
        )


def purger(jours=400):
    """Garde l'historique récent au pas fin, un point par jour au-delà."""
    limite = (datetime.now() - timedelta(days=30)).isoformat()
    vieux = (datetime.now() - timedelta(days=jours)).isoformat()
    with cx() as c:
        c.execute("DELETE FROM releves WHERE horodate < ?", (vieux,))
        c.execute(
            """DELETE FROM releves WHERE horodate < ? AND id NOT IN (
                 SELECT MIN(id) FROM releves WHERE horodate < ?
                 GROUP BY ligne_id, substr(horodate, 1, 10))""",
            (limite, limite),
        )
        c.execute("DELETE FROM journal WHERE horodate < ?", (vieux,))


# ------------------------------------------------------------------ amorçage
def _amorcer():
    """Ton portefeuille actuel, repris des captures Finary.
    Les quantités crypto et ETF sont calibrées au premier passage
    des collecteurs, ou remplacées par les vraies via Kraken."""
    upsert_compte("pea", "PEA Fortuneo", "invest", "Fortuneo", ordre=1)
    upsert_ligne("l1", "pea", "Amundi PEA Nasdaq-100", sous_titre="FR0011871110",
                 quantite=1, prix_unite=9669, investi=7768, source="yfinance", code="PUST.PA")
    upsert_ligne("l2", "pea", "BNP Paribas Easy S&P 500", sous_titre="FR0011550193",
                 quantite=1, prix_unite=2355, investi=2094, source="yfinance", code="ESE.PA")
    upsert_ligne("l3", "pea", "Amundi PEA MSCI", sous_titre="FR0013412012",
                 quantite=1, prix_unite=2418, investi=2510, source="yfinance", code="PAEEM.PA")

    upsert_compte("kraken", "Kraken", "crypto", "Kraken", source="kraken", ordre=2)
    upsert_ligne("l4", "kraken", "Ethereum", sous_titre="ETH",
                 quantite=1, prix_unite=7439, investi=4758, source="coingecko", code="ethereum")
    upsert_ligne("l5", "kraken", "Hyperliquid", sous_titre="HYPE",
                 quantite=1, prix_unite=2755, investi=2099, source="coingecko", code="hyperliquid")
    upsert_ligne("l6", "kraken", "Zcash", sous_titre="ZEC",
                 quantite=1, prix_unite=2463, investi=1000, source="coingecko", code="zcash")

    upsert_compte("av", "Assurance vie", "invest", "LCL", ordre=3)
    upsert_ligne("l7", "av", "Contrat multisupport", sous_titre="Assurance vie",
                 quantite=1, prix_unite=5213, investi=3946)

    upsert_compte("cd", "Compte de dépôts", "courant", "LCL", source="gocardless", ordre=4)
    upsert_ligne("l8", "cd", "Solde courant", sous_titre="Compte à vue",
                 quantite=1, prix_unite=3706, investi=3706)

    upsert_compte("pee", "Plan d'épargne entreprise", "invest", "Amundi", ordre=5)
    upsert_ligne("l9", "pee", "PEE Groupe Bouygues", sous_titre="QS0009012087",
                 quantite=1, prix_unite=2495, investi=2653)

    upsert_compte("poke", "Collection Pokémon", "pokemon", "Suivi manuel", ordre=6)
    upsert_ligne("l11", "poke", "ECP Sulfura", sous_titre="Coffret",
                 quantite=1, prix_unite=249.90, investi=160, style="upc")
    upsert_ligne("l12", "poke", "Demi display Nuit Noire", sous_titre="Display",
                 quantite=1, prix_unite=120, investi=108, style="display")
    upsert_ligne("l13", "poke", "Bundle Nuit Noire", sous_titre="Bundle",
                 quantite=1, prix_unite=41.97, investi=35.94, style="bundle")

    upsert_compte("montres", "Montres", "montre", "Suivi manuel", ordre=7)
    upsert_ligne("l10", "montres", "Ballade Powermatic 80", sous_titre="Tissot",
                 quantite=1, prix_unite=625, investi=1025, style="ballade")

    upsert_compte("lj", "Livret jeune", "epargne", "LCL", source="gocardless", ordre=8)
    upsert_ligne("l14", "lj", "Livret jeune", sous_titre="Épargne réglementée",
                 quantite=1, prix_unite=100, investi=100)

    enregistrer_releve()
