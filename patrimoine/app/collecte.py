"""
Les collecteurs. Chacun est autonome : s'il n'a pas ses clés, il se
signale "non configuré" et les autres continuent.

Fréquences réalistes (voir planif.py) :
  crypto   toutes les 5 min   — le cours bouge vraiment
  bourse   toutes les 30 min  — Yahoo est différé d'un quart d'heure
  cartes   toutes les 6 h     — les agrégateurs recalculent leurs tendances 1×/jour
  banque   toutes les 12 h    — l'agrégateur limite les appels quotidiens
"""
import base64
import hashlib
import hmac
import os
import time
import urllib.parse
import uuid
from datetime import datetime

import httpx

from . import db

TIMEOUT = 21.0


def _env(cle):
    v = os.getenv(cle, "").strip()
    return v or None


# =====================================================================
#  CRYPTO — CoinGecko (cours) + Kraken (quantités réelles)
# =====================================================================
CG = "https://api.coingecko.com/api/v3"


async def cours_crypto():
    """Cours en euros. Aucune clé nécessaire."""
    lignes = [l for l in db.lister_lignes() if l["source"] == "coingecko" and l["code"]]
    if not lignes:
        return
    ids = ",".join(sorted({l["code"] for l in lignes}))
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{CG}/simple/price",
                            params={"ids": ids, "vs_currencies": "eur", "include_24hr_change": "true"})
            r.raise_for_status()
            data = r.json()
        n = 0
        for l in lignes:
            d = data.get(l["code"])
            if not d or not d.get("eur"):
                continue
            prix = float(d["eur"])
            # Première fois : on déduit la quantité de la valorisation de départ.
            # Elle sera écrasée par la vraie quantité dès que Kraken répond.
            q = l["quantite"]
            if q in (None, 0) or (q == 1 and l["prix_unite"] > 100):
                q = round(l["prix_unite"] / prix, 10)
            db.maj_cours(l["id"], prix, q)
            n += 1
        db.journaliser("coingecko", "ok", f"{n} cours")
    except Exception as e:
        db.journaliser("coingecko", "erreur", e)


KRAKEN = "https://api.kraken.com"
# Kraken préfixe ses vieux actifs (XETH, XXBT, ZEUR…) et nomme l'ETH
# staké ETH2 / ETH2.S. On veut tout ramener au ticker courant.
ALIAS = {"XETH": "ETH", "ETH2": "ETH", "XXBT": "BTC", "XBT": "BTC",
         "XXDG": "DOGE", "ZEUR": "EUR", "XZEC": "ZEC", "XLTC": "LTC",
         "XXRP": "XRP"}


def _signature(chemin, corps, secret):
    postdata = urllib.parse.urlencode(corps)
    encode = (str(corps["nonce"]) + postdata).encode()
    message = chemin.encode() + hashlib.sha256(encode).digest()
    mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
    return base64.b64encode(mac.digest()).decode()


async def soldes_kraken():
    """Quantités réellement détenues. Clé en lecture seule (Query Funds)."""
    cle, secret = _env("KRAKEN_KEY"), _env("KRAKEN_SECRET")
    if not (cle and secret):
        db.journaliser("kraken", "ignore", "clés absentes")
        return
    chemin = "/0/private/Balance"
    corps = {"nonce": str(int(time.time() * 1000))}
    entetes = {"API-Key": cle, "API-Sign": _signature(chemin, corps, secret),
               "Content-Type": "application/x-www-form-urlencoded"}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(KRAKEN + chemin, data=corps, headers=entetes)
            r.raise_for_status()
            j = r.json()
        if j.get("error"):
            raise RuntimeError(j["error"])

        soldes = {}
        for actif, montant in j["result"].items():
            base = actif.split(".")[0]          # ETH2.S -> ETH2, HYPE.B -> HYPE
            code = ALIAS.get(base, base)        # ETH2 -> ETH, XETH -> ETH
            soldes[code] = soldes.get(code, 0) + float(montant)

        # Rapprochement avec les lignes du compte Kraken, par ticker
        compte = next((c for c in db.lister_comptes() if c["source"] == "kraken"), None)
        if not compte:
            db.journaliser("kraken", "ok", "aucun compte Kraken déclaré")
            return
        n = 0
        for l in db.lister_lignes(compte["id"]):
            tick = (l["sous_titre"] or "").upper()
            if tick in soldes and soldes[tick] > 0:
                db.maj_ligne(l["id"], quantite=soldes[tick])
                n += 1
        db.journaliser("kraken", "ok", f"{n} quantités, {len(soldes)} actifs au compte")
    except Exception as e:
        db.journaliser("kraken", "erreur", e)


# =====================================================================
#  BOURSE — Yahoo Finance, endpoint chart public en direct
# ---------------------------------------------------------------------
#  On n'utilise plus yfinance : sa danse cookie/crumb casse dès que
#  Yahoo la change (d'où les "0 cours" à répétition). L'endpoint chart
#  répond en GET simple, sans clé, prix dans la devise de cotation
#  (EUR pour les lignes .PA d'Euronext Paris).
# =====================================================================
YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{}"
_UA_NAV = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
           "(KHTML, like Gecko) Chrome/120 Safari/537.36")


async def cours_bourse():
    lignes = [l for l in db.lister_lignes() if l["source"] == "yfinance" and l["code"]]
    if not lignes:
        return
    n, echecs = 0, []
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": _UA_NAV}) as c:
            for l in lignes:
                try:
                    r = await c.get(YF_CHART.format(l["code"]),
                                    params={"interval": "1d", "range": "5d"})
                    r.raise_for_status()
                    res = (r.json().get("chart") or {}).get("result")
                    if not res:
                        echecs.append(l["code"])
                        continue
                    meta = res[0].get("meta") or {}
                    prix = meta.get("regularMarketPrice")
                    if not prix:  # repli : dernière clôture non nulle
                        clot = (((res[0].get("indicators") or {})
                                 .get("quote") or [{}])[0]).get("close") or []
                        prix = next((x for x in reversed(clot) if x), None)
                    if not prix:
                        echecs.append(l["code"])
                        continue
                    prix = float(prix)
                    q = l["quantite"]
                    if q in (None, 0) or (q == 1 and l["prix_unite"] > prix * 1.5):
                        q = round(l["prix_unite"] / prix, 6)
                    db.maj_cours(l["id"], prix, q)
                    n += 1
                except Exception as e:
                    echecs.append(f"{l['code']}: {e}")
        db.journaliser("yfinance", "ok" if n else "erreur",
                       f"{n} cours" + (f", échecs {echecs}" if echecs else ""))
    except Exception as e:
        db.journaliser("yfinance", "erreur", e)


# =====================================================================
#  CARTES — PokemonTCG.io (image officielle + prix Cardmarket)
# ---------------------------------------------------------------------
#  PokemonTCG.io tombe régulièrement en 502. On réessaie quelques fois,
#  puis on bascule sur TCG API (même clé que le scellé) qui couvre
#  aussi les cartes à l'unité.
# =====================================================================
PTCG = "https://api.pokemontcg.io/v2"


def _entetes_ptcg():
    k = _env("POKEMONTCG_KEY")
    return {"X-Api-Key": k} if k else {}


def _prix_carte(c):
    p = (c.get("cardmarket") or {}).get("prices") or {}
    return p.get("trendPrice") or p.get("averageSellPrice") or p.get("avg30") or 0


async def _get_retry(client, url, *, essais=3, **kw):
    """GET avec quelques tentatives : PokemonTCG.io renvoie des 502 par salves."""
    derniere = None
    for i in range(essais):
        try:
            r = await client.get(url, **kw)
            if r.status_code < 500:
                return r
            derniere = RuntimeError(f"HTTP {r.status_code}")
        except Exception as e:
            derniere = e
        await asyncio.sleep(0.6 * (i + 1))
    raise derniere or RuntimeError("échec")


async def chercher_cartes(nom, limite=12):
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await _get_retry(c, f"{PTCG}/cards", headers=_entetes_ptcg(),
                                 params={"q": f'name:"{nom}"', "pageSize": limite,
                                         "orderBy": "-set.releaseDate"})
            r.raise_for_status()
            cartes = [{
                "id": x["id"], "nom": x["name"],
                "set": (x.get("set") or {}).get("name", ""), "numero": x.get("number", ""),
                "image": (x.get("images") or {}).get("large") or (x.get("images") or {}).get("small"),
                "prix": round(_prix_carte(x), 2),
            } for x in r.json().get("data", [])]
        if cartes:
            return cartes
    except Exception:
        pass  # PokemonTCG.io injoignable -> on tente TCG API
    return await _chercher_tcgapi(nom, limite, sceau=False)


async def cours_cartes():
    lignes = [l for l in db.lister_lignes() if l["source"] == "pokemontcg" and l["code"]]
    if not lignes:
        return
    n = 0
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            for l in lignes:
                try:
                    r = await _get_retry(c, f"{PTCG}/cards/{l['code']}", headers=_entetes_ptcg())
                except Exception:
                    continue
                if r.status_code != 200:
                    continue
                carte = r.json().get("data") or {}
                prix = _prix_carte(carte)
                if prix:
                    db.maj_cours(l["id"], round(prix, 2))
                    n += 1
        db.journaliser("pokemontcg", "ok" if n else "erreur", f"{n} cartes")
    except Exception as e:
        db.journaliser("pokemontcg", "erreur", e)


# =====================================================================
#  SCELLÉ — TCG API (tcgapi.dev), agrège TCGplayer & Cardmarket
# ---------------------------------------------------------------------
#  Remplace l'ancienne API Cardmarket (OAuth 1.0a). TCG API agrège les
#  prix des marketplaces sous licence — donc pas de scraping — et couvre
#  explicitement le scellé Pokémon (booster boxes, ETB, blisters,
#  coffrets). Gratuit : 100 requêtes/jour avec une clé sur tcgapi.dev.
#  Plus de signature : une simple clé dans l'en-tête X-API-Key.
#  Prix rendus en USD, convertis en EUR (taux frankfurter.app).
# =====================================================================
TCGAPI = "https://api.tcgapi.dev/v1"


def _entetes_tcgapi():
    k = _env("TCGAPI_KEY")
    return {"X-API-Key": k} if k else None


async def _usd_vers_eur(client):
    try:
        fx = await client.get("https://api.frankfurter.app/latest?from=USD&to=EUR")
        return float(fx.json()["rates"]["EUR"])
    except Exception:
        return 0.92


def _prix_tcgapi(obj):
    """Extrait un prix marché quel que soit l'endroit où l'endpoint le place."""
    if isinstance(obj, list):
        return _prix_tcgapi(obj[0]) if obj else 0
    if not isinstance(obj, dict):
        return 0
    for cle in ("market_price", "median_price", "low_price", "price"):
        v = obj.get(cle)
        if v:
            return float(v)
    if "prices" in obj:
        return _prix_tcgapi(obj["prices"])
    return 0


def _mappe_tcgapi(p, taux):
    return {
        "id": str(p.get("id")),
        "nom": p.get("name"),
        "set": p.get("set_name") or p.get("set") or "",
        "numero": p.get("number") or "",
        "image": p.get("image_url") or p.get("image"),
        "prix": round(_prix_tcgapi(p) * taux, 2),
        "source": "tcgapi",
    }


async def _chercher_tcgapi(terme, limite=12, sceau=True):
    """Recherche sur TCG API. `sceau` filtre sur les produits scellés,
    sinon sur les cartes à l'unité. Renvoie une liste (ou lève).

    Le filtre `type` est fait côté serveur (doc : `type=Sealed Products`
    ou `type=Cards`) ; on garde un filtre local en secours.
    """
    ent = _entetes_tcgapi()
    if not ent:
        raise RuntimeError("TCG API non configurée (TCGAPI_KEY)")
    typ = "Sealed Products" if sceau else "Cards"
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        taux = await _usd_vers_eur(c)
        r = await c.get(f"{TCGAPI}/search", headers=ent,
                        params={"q": terme, "game": "pokemon", "type": typ,
                                "sort": "relevance", "per_page": limite})
        r.raise_for_status()
        data = r.json().get("data", [])
    voulu = "sealed" if sceau else "card"
    tries = [p for p in data if voulu in (p.get("product_type") or "").lower()]
    return [_mappe_tcgapi(p, taux) for p in (tries or data)[:limite]]


async def _prix_ligne_tcgapi(client, ent, code):
    """Prix marché d'un produit via l'endpoint dédié `/cards/:id/prices`
    (le seul qui renvoie vraiment les prix par variante). Renvoie 0 sinon."""
    try:
        r = await client.get(f"{TCGAPI}/cards/{code}/prices", headers=ent)
        if r.status_code == 200:
            p = _prix_tcgapi(r.json().get("data"))
            if p:
                return p
        # repli : la fiche elle-même porte parfois median_price / low_price
        r = await client.get(f"{TCGAPI}/cards/{code}", headers=ent)
        if r.status_code == 200:
            return _prix_tcgapi(r.json().get("data"))
    except Exception:
        pass
    return 0


async def chercher_scelle(terme, limite=10):
    """Recherche de produits scellés Pokémon. [] proprement si pas de clé."""
    try:
        return {"resultats": await _chercher_tcgapi(terme, limite, sceau=True)}
    except Exception as e:
        return {"erreur": str(e) or repr(e), "resultats": []}


# ---------------------------------------------------------------------
#  CardTrader — prix marché EUROPÉENS pour le scellé (optionnel)
# ---------------------------------------------------------------------
#  TCG API ne rend que des prix TCGplayer (marché US). CardTrader est une
#  marketplace européenne : si CARDTRADER_KEY est renseignée, on prend
#  plutôt la plus basse annonce EUR de CardTrader (plus proche de la
#  réalité française), sinon on retombe sur TCG API converti en EUR.
#
#  Jeton gratuit : compte CardTrader > Settings > API Access > Create
#  New Token. Doc : cardtrader.com/en/docs/api/full/reference
#  Pas de recherche texte : on résout via le tcgplayer_id porté à la
#  fois par la fiche TCG API et par les "blueprints" CardTrader.
# ---------------------------------------------------------------------
CT = "https://api.cardtrader.com/api/v2"
_ct_cache = {"jeu": None, "expansions": None, "bp": {}}  # caches de session


def _entetes_ct():
    k = _env("CARDTRADER_KEY")
    return {"Authorization": f"Bearer {k}"} if k else None


def _norm(s):
    return "".join(ch for ch in (s or "").lower() if ch.isalnum() or ch == " ").strip()


async def _ct_expansions(client, ent):
    if _ct_cache["expansions"] is not None:
        return _ct_cache["expansions"]
    # id du jeu Pokémon
    if _ct_cache["jeu"] is None:
        rg = await client.get(f"{CT}/games", headers=ent)
        rg.raise_for_status()
        jeux = rg.json().get("array") or rg.json().get("games") or rg.json()
        _ct_cache["jeu"] = next((g["id"] for g in jeux
                                 if "pok" in _norm(g.get("name"))), None)
    re_ = await client.get(f"{CT}/expansions", headers=ent)
    re_.raise_for_status()
    tout = re_.json().get("array") or re_.json()
    _ct_cache["expansions"] = [e for e in tout
                               if _ct_cache["jeu"] in (None, e.get("game_id"))]
    return _ct_cache["expansions"]


async def _ct_blueprint_id(client, ent, set_nom, tcgplayer_id, nom):
    """Trouve le blueprint CardTrader. Match exact sur tcg_player_id,
    repli sur le nom. Les exports de blueprints sont mis en cache."""
    exps = await _ct_expansions(client, ent)
    cible = _norm(set_nom).split(":")[-1].strip()
    cands = [e for e in exps if cible and (cible in _norm(e.get("name"))
             or _norm(e.get("name")) in cible)] or exps
    for e in cands[:6]:
        eid = e.get("id")
        if eid not in _ct_cache["bp"]:
            try:
                rb = await client.get(f"{CT}/blueprints/export",
                                      headers=ent, params={"expansion_id": eid})
                rb.raise_for_status()
                _ct_cache["bp"][eid] = rb.json().get("array") or rb.json()
            except Exception:
                _ct_cache["bp"][eid] = []
        bps = _ct_cache["bp"][eid]
        if tcgplayer_id:
            bp = next((b for b in bps if str(b.get("tcg_player_id")) == str(tcgplayer_id)), None)
            if bp:
                return bp.get("id")
        bp = next((b for b in bps if _norm(nom) and _norm(nom) == _norm(b.get("name"))), None)
        if bp:
            return bp.get("id")
    return None


async def _prix_cardtrader(client, ent, set_nom, tcgplayer_id, nom):
    """Plus basse annonce EUR sur CardTrader pour ce produit. 0 si rien."""
    try:
        bid = await _ct_blueprint_id(client, ent, set_nom, tcgplayer_id, nom)
        if not bid:
            return 0
        r = await client.get(f"{CT}/marketplace/products",
                             headers=ent, params={"blueprint_id": bid})
        r.raise_for_status()
        data = r.json()
        produits = data.get(str(bid)) or data.get(bid) or []
        prix = [p["price"]["cents"] / 100 for p in produits
                if (p.get("price") or {}).get("currency") == "EUR"
                and (p.get("price") or {}).get("cents")
                and p.get("quantity", 0) > 0
                and not p.get("on_vacation") and not p.get("graded")]
        return round(min(prix), 2) if prix else 0
    except Exception:
        return 0


async def cours_scelle():
    """Rafraîchit les lignes servies par TCG API (scellé + cartes tombées
    en repli quand PokemonTCG.io était HS). Prix EUR : CardTrader si
    configuré, sinon TCGplayer converti."""
    lignes = [l for l in db.lister_lignes() if l["source"] == "tcgapi" and l["code"]]
    if not lignes:
        return
    ent = _entetes_tcgapi()
    if not ent:
        db.journaliser("tcgapi", "ignore", "clé absente (TCGAPI_KEY)")
        return
    ent_ct = _entetes_ct()
    n, n_ct = 0, 0
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            taux = await _usd_vers_eur(c)
            for l in lignes:
                fiche = {}
                try:
                    rf = await c.get(f"{TCGAPI}/cards/{l['code']}", headers=ent)
                    if rf.status_code == 200:
                        fiche = rf.json().get("data") or {}
                except Exception:
                    pass
                prix = 0
                if ent_ct:
                    prix = await _prix_cardtrader(
                        c, ent_ct, fiche.get("set_name") or l.get("sous_titre") or "",
                        fiche.get("tcgplayer_id"), fiche.get("name") or l["nom"])
                    if prix:
                        n_ct += 1
                if not prix:
                    us = await _prix_ligne_tcgapi(c, ent, l["code"])
                    prix = round(us * taux, 2) if us else 0
                if prix:
                    db.maj_cours(l["id"], prix)
                    n += 1
        detail = f"{n} lignes TCG API" + (f" (dont {n_ct} prix CardTrader €)" if n_ct else "")
        db.journaliser("tcgapi", "ok" if n else "erreur", detail)
    except Exception as e:
        db.journaliser("tcgapi", "erreur", e)


async def cours_pricecharting():
    """Alternative payante, couvre aussi le scellé. Prix rendus en cents US."""
    jeton = _env("PRICECHARTING_TOKEN")
    lignes = [l for l in db.lister_lignes() if l["source"] == "pricecharting" and l["code"]]
    if not (jeton and lignes):
        return
    n = 0
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            taux = 0.92
            try:
                fx = await c.get("https://api.frankfurter.app/latest?from=USD&to=EUR")
                taux = fx.json()["rates"]["EUR"]
            except Exception:
                pass
            for l in lignes:
                r = await c.get("https://www.pricecharting.com/api/product",
                                params={"t": jeton, "id": l["code"]})
                if r.status_code != 200:
                    continue
                cents = r.json().get("loose-price") or r.json().get("new-price")
                if cents:
                    db.maj_cours(l["id"], round(int(cents) / 100 * taux, 2))
                    n += 1
        db.journaliser("pricecharting", "ok", f"{n} produits")
    except Exception as e:
        db.journaliser("pricecharting", "erreur", e)


# =====================================================================
#  BANQUES — GoCardless Bank Account Data (DSP2, lecture seule)
# =====================================================================
GC = "https://bankaccountdata.gocardless.com/api/v2"
_jeton_gc = {"valeur": None, "expire": 0}


async def _token_gc():
    if _jeton_gc["valeur"] and time.time() < _jeton_gc["expire"]:
        return _jeton_gc["valeur"]
    sid, skey = _env("GOCARDLESS_ID"), _env("GOCARDLESS_KEY")
    if not (sid and skey):
        return None
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.post(f"{GC}/token/new/", json={"secret_id": sid, "secret_key": skey})
        r.raise_for_status()
        j = r.json()
    _jeton_gc.update(valeur=j["access"], expire=time.time() + j.get("access_expires", 86400) - 60)
    return _jeton_gc["valeur"]


async def banques_disponibles(pays="fr"):
    t = await _token_gc()
    if not t:
        return {"erreur": "GoCardless non configuré", "banques": []}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.get(f"{GC}/institutions/", params={"country": pays},
                        headers={"Authorization": f"Bearer {t}"})
        r.raise_for_status()
    return {"banques": [{"id": b["id"], "nom": b["name"], "logo": b.get("logo")} for b in r.json()]}


async def demander_consentement(institution_id, redirection):
    """Renvoie le lien à ouvrir. C'est TOI qui t'authentifies chez ta banque."""
    t = await _token_gc()
    if not t:
        return {"erreur": "GoCardless non configuré"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        r = await c.post(f"{GC}/requisitions/",
                         headers={"Authorization": f"Bearer {t}"},
                         json={"redirect": redirection, "institution_id": institution_id,
                               "reference": uuid.uuid4().hex, "user_language": "FR"})
        r.raise_for_status()
        j = r.json()
    return {"id": j["id"], "lien": j["link"]}


async def rattacher_requisition(requisition_id):
    """Après ton consentement : crée un compte par compte bancaire trouvé."""
    t = await _token_gc()
    if not t:
        return {"erreur": "GoCardless non configuré"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        ent = {"Authorization": f"Bearer {t}"}
        r = await c.get(f"{GC}/requisitions/{requisition_id}/", headers=ent)
        r.raise_for_status()
        comptes = r.json().get("accounts", [])
        crees = []
        for cid in comptes:
            d = (await c.get(f"{GC}/accounts/{cid}/details/", headers=ent)).json().get("account", {})
            nom = d.get("name") or d.get("product") or "Compte bancaire"
            categorie = "epargne" if "livret" in nom.lower() else "courant"
            db.upsert_compte(f"gc_{cid[:8]}", nom, categorie,
                             institution=d.get("ownerName") or "Banque",
                             source="gocardless", ref_externe=cid)
            db.upsert_ligne(f"gcl_{cid[:8]}", f"gc_{cid[:8]}", nom,
                            sous_titre=d.get("iban", "")[-8:], source="gocardless", code=cid)
            crees.append(nom)
    db.journaliser("gocardless", "ok", f"rattachés : {crees}")
    return {"comptes": crees}


async def soldes_banques():
    t = await _token_gc()
    if not t:
        db.journaliser("gocardless", "ignore", "clés absentes")
        return
    lignes = [l for l in db.lister_lignes() if l["source"] == "gocardless" and l["code"]]
    if not lignes:
        return
    n = 0
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            for l in lignes:
                r = await c.get(f"{GC}/accounts/{l['code']}/balances/",
                                headers={"Authorization": f"Bearer {t}"})
                if r.status_code != 200:
                    continue
                bal = r.json().get("balances", [])
                inter = next((b for b in bal if b.get("balanceType") == "interimAvailable"), None)
                choisi = inter or (bal[0] if bal else None)
                if choisi:
                    db.maj_cours(l["id"], float(choisi["balanceAmount"]["amount"]), 1)
                    n += 1
        db.journaliser("gocardless", "ok", f"{n} soldes")
    except Exception as e:
        db.journaliser("gocardless", "erreur", e)


# =====================================================================
#  ORCHESTRATION
# =====================================================================
async def collecte_crypto():
    await soldes_kraken()
    await cours_crypto()
    db.enregistrer_releve()


async def collecte_bourse():
    await cours_bourse()
    db.enregistrer_releve()


async def collecte_cartes():
    await cours_cartes()
    await cours_scelle()
    await cours_pricecharting()
    db.enregistrer_releve()


async def collecte_banque():
    await soldes_banques()
    db.enregistrer_releve()
    db.purger()


async def tout_collecter():
    await collecte_crypto()
    await collecte_bourse()
    await collecte_cartes()
    await collecte_banque()
    return {"fait": datetime.now().isoformat(timespec="seconds")}
