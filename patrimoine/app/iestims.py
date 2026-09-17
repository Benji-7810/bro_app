"""
Import des exports CSV d'iEstims (appli mobile d'estimation Pokémon).

Deux fichiers, deux formats :
  portefeuille_cartes.csv  Nom, Numéro, Série, Bloc, État, Version, …
  portefeuille_items.csv   Item, Série, Quantité, Prix Achat, Prix Actuel

Les prix importés remplacent la cote : iEstims tient compte de l'état et
du grading, ce que PokemonTCG.io ne fait pas. En contrepartie ils ne
bougent plus tout seuls — d'où la source `iestims`, que les collecteurs
ignorent. Réimporter le même fichier met les prix à jour sans créer de
doublon : l'identifiant de ligne est dérivé de l'identité de la carte.
"""
import csv
import hashlib
import io

import httpx

from . import collecte, db

SOURCE = "iestims"

# Ce que vaut une carte par rapport à la cote Cardmarket, qui suppose du
# Near Mint. Ordres de grandeur du marché, à ajuster à la main si besoin :
# ce sont des estimations, exactement comme celles d'iEstims.
COEF_ETAT = {"mint": 1.0, "near mint": 1.0, "nm": 1.0, "excellent": 0.85,
             "ex": 0.85, "good": 0.7, "bon": 0.7, "light played": 0.6,
             "played": 0.5, "poor": 0.3, "damaged": 0.3}
COEF_GRADE = {("psa", "10"): 4.0, ("psa", "9"): 1.8, ("psa", "8"): 1.3,
              ("pca", "10"): 3.0, ("pca", "9"): 1.6,
              ("bgs", "10"): 5.0, ("bgs", "9.5"): 2.5, ("bgs", "9"): 1.7,
              ("cgc", "10"): 3.5, ("cgc", "9.5"): 2.0}


def _coefficient(etat, societe, note):
    """Une PSA 10 ne vaut pas une carte jouée : on module la cote."""
    if societe and note:
        cle = (societe.strip().lower(), note.strip().lower().rstrip("."))
        if cle in COEF_GRADE:
            return COEF_GRADE[cle]
        return 2.0          # gradée mais barème inconnu : prime prudente
    return COEF_ETAT.get((etat or "").strip().lower(), 1.0)

# iEstims nomme ses produits scellés ainsi ; on les rattache aux visuels
# que le front sait déjà dessiner.
STYLES = {"upc": "upc", "etb": "upc", "coffret": "bundle", "bundle": "bundle",
          "display": "display", "demi_display": "display"}
LIBELLES = {"upc": "Ultra Premium Collection", "etb": "Elite Trainer Box",
            "coffret": "Coffret", "bundle": "Bundle", "display": "Display",
            "demi_display": "Demi-display"}


def _nombre(v):
    """Les exports mélangent les formats : "0,00 €", "160,00" et 8.09."""
    s = str(v or "").strip()
    for parasite in ("€", " ", "\xa0", " ", "_"):
        s = s.replace(parasite, "")
    if not s:
        return 0.0
    if "," in s:                      # virgule décimale à la française
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _texte(v):
    s = str(v or "").strip()
    return "" if s == "_" else s


def _identifiant(prefixe, *parties):
    graine = "|".join(_texte(p).lower() for p in parties)
    return prefixe + hashlib.sha1(graine.encode()).hexdigest()[:10]


def _colonnes(entetes):
    return {(e or "").strip().lower() for e in entetes}


def detecter(entetes):
    c = _colonnes(entetes)
    if {"nom", "numéro", "série"} <= c:
        return "cartes"
    if {"item", "série", "quantité"} <= c:
        return "items"
    return None


def _lire_cartes(lignes):
    """Regroupe les doublons : deux fois la même carte = quantité 2."""
    groupes = {}
    for r in lignes:
        nom = _texte(r.get("Nom"))
        if not nom:
            continue
        numero, serie = _texte(r.get("Numéro")), _texte(r.get("Série"))
        version, langue = _texte(r.get("Version")), _texte(r.get("Langue Carte"))
        societe, note = _texte(r.get("Société de gradation")), _texte(r.get("Note de gradation"))
        etat = _texte(r.get("État"))

        lid = _identifiant("ic", nom, numero, serie, version, langue, societe, note)
        detail = f"{societe} {note}".strip() if societe or note else etat
        g = groupes.setdefault(lid, {
            "id": lid, "nom": nom, "style": "carte",
            "sous_titre": " · ".join(x for x in (f"{serie} {numero}".strip(), detail) if x),
            "quantite": 0, "prix_unite": _nombre(r.get("Prix Actuel")), "investi": 0.0,
            "serie": serie, "numero": numero,
            "coef": _coefficient(etat, societe, note),
        })
        g["quantite"] += 1
        g["investi"] += _nombre(r.get("Prix Achat"))
    return list(groupes.values())


async def _resoudre(entrees):
    """Associe chaque carte à son identifiant TCGdex (série + numéro).
    Celles qui matchent basculent en cotation automatique ; les autres
    gardent le prix figé d'iEstims jusqu'à ce qu'on les lie à la main."""
    liees = 0
    async with httpx.AsyncClient(timeout=collecte.TIMEOUT) as c:
        for e in entrees:
            try:
                code = await collecte.resoudre_carte(c, e.get("serie"), e.get("numero"))
            except Exception:
                code = None
            if code:
                e["code"], e["source"] = code, "tcgdex"
                liees += 1
    return liees


def _lire_items(lignes):
    sortie = []
    for r in lignes:
        genre = _texte(r.get("Item")).lower()
        serie = _texte(r.get("Série"))
        if not genre and not serie:
            continue
        qte = _nombre(r.get("Quantité")) or 1
        sortie.append({
            "id": _identifiant("ii", genre, serie),
            "nom": serie or LIBELLES.get(genre, genre),
            "sous_titre": LIBELLES.get(genre, genre.replace("_", " ").title()),
            "style": STYLES.get(genre, "upc"),
            "quantite": qte,
            # iEstims donne un prix total par produit, pas un prix unitaire.
            "prix_unite": _nombre(r.get("Prix Actuel")) / qte if qte else 0.0,
            "investi": _nombre(r.get("Prix Achat")),
        })
    return sortie


async def importer(contenu, compte_id):
    """Crée ou met à jour les lignes. Renvoie un résumé pour le front."""
    lecteur = csv.DictReader(io.StringIO(contenu.lstrip("﻿")))
    genre = detecter(lecteur.fieldnames or [])
    if not genre:
        raise ValueError(
            "Ce fichier ne ressemble pas à un export iEstims. Attendu : "
            "portefeuille_cartes.csv ou portefeuille_items.csv."
        )

    rangs = list(lecteur)
    entrees = _lire_cartes(rangs) if genre == "cartes" else _lire_items(rangs)
    if not entrees:
        raise ValueError("Le fichier est vide.")

    liees = await _resoudre(entrees) if genre == "cartes" else 0

    connues = {l["id"] for l in db.lister_lignes()}
    nouvelles = 0
    for e in entrees:
        if e["id"] not in connues:
            nouvelles += 1
        db.upsert_ligne(e["id"], compte_id, e["nom"], sous_titre=e["sous_titre"],
                        quantite=e["quantite"], prix_unite=round(e["prix_unite"], 2),
                        investi=round(e["investi"], 2),
                        source=e.get("source", SOURCE), code=e.get("code"),
                        style=e["style"], etat="ok", coef=e.get("coef", 1))
    db.enregistrer_releve()
    db.journaliser(SOURCE, "ok",
                   f"{genre} : {len(entrees)} lignes, {nouvelles} nouvelles, {liees} liées")
    return {
        "genre": genre,
        "lignes": len(entrees),
        "nouvelles": nouvelles,
        "majes": len(entrees) - nouvelles,
        "liees": liees,
        "aLier": len(entrees) - liees if genre == "cartes" else 0,
        "valeur": round(sum(e["prix_unite"] * e["quantite"] for e in entrees), 2),
    }
