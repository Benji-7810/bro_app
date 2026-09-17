# Patrimoine — intégré dans FORGE

Ce dossier sert **tout le site FORGE** (accueil, chapitres) **et** le tableau
de bord patrimonial. Un seul backend Python collecte les cours et sert les
pages : plus de problème de CORS, les clés restent sur ta machine.

- `/` — accueil FORGE
- `/finance.html` — chapitre « Finance & Patrimoine » = le dashboard complet
- `/personal.html`, `/career.html` — les deux autres chapitres

## Démarrage (une fois le dépôt cloné)

```bash
cd patrimoine
python -m venv .venv
.venv\Scripts\activate          # Windows — sous Mac/Linux : source .venv/bin/activate
pip install -r requirements.txt
copy env.example.txt .env       # Windows — sous Mac/Linux : cp env.example.txt .env
```

Puis remplis `.env` avec tes clés (Kraken, GoCardless, etc. — voir plus bas,
tout est optionnel sauf CoinGecko/Yahoo qui marchent sans clé).

## Lancer le serveur (à chaque fois)

```bash
cd patrimoine
.venv\Scripts\activate          # Windows — sous Mac/Linux : source .venv/bin/activate
uvicorn app.main:app --reload
```

Puis ouvre **http://127.0.0.1:8000** dans ton navigateur. Tu tombes sur
l'écran de connexion (voir plus bas), puis sur l'accueil FORGE. Clique
« Découvrir » sous « Finance & Patrimoine » pour accéder au dashboard.
Pour arrêter le serveur : `Ctrl+C` dans le terminal.

Le tableau de bord démarre **vide** : aucun compte, aucune ligne. Tu
ajoutes tes comptes et tes actifs depuis l'interface, ou tu les laisses
arriver tout seuls en connectant une source (Kraken, GoCardless).

## Ajouter des actifs à la main

Chaque onglet a son bouton **Saisie manuelle**, et les onglets branchés
sur une API ont en plus un sélecteur :

| Onglet | Sélecteur | Cours ensuite |
|---|---|---|
| Crypto | recherche CoinGecko | automatique, 5 min |
| ETF | catalogue de 95 ETF + recherche Yahoo | automatique, 30 min |
| Pokémon | recherche cartes et scellé, **import iEstims** | automatique, 6 h |
| Montres | catalogue de 15 modèles | manuel |

Le catalogue ETF (`app/static/etf.json`) couvre les grands trackers
UCITS et américains, dont 20 éligibles PEA, filtrables par thème. Chaque
ticker a été vérifié contre Yahoo Finance et les noms viennent de là.
Si un ETF manque, l'onglet « Chercher ailleurs » interroge Yahoo en
direct : tout ce qu'il connaît (ETF, actions, indices) est ajoutable.

Quand un cours est récupéré automatiquement, laisse le prix unitaire à 0
en ajoutant la ligne : le collecteur le remplit dans la foulée. Ne
renseigne que la **quantité** et le **montant investi**.

Les cours étrangers sont convertis en euros au taux du jour : un ETF
coté 754 $ est enregistré à sa contre-valeur en euros, pas à 754 €.

Les comptes se créent et se suppriment dans l'onglet **Comptes**.
Supprimer un compte supprime ses lignes et leur historique.

## Connexion

Tout le site est derrière un mot de passe : accueil, chapitres, dashboard
et API. Sans session valide, les pages renvoient vers `/connexion` et
l'API répond 401.

À la **première visite**, la page te demande de choisir un identifiant et
un mot de passe (8 caractères minimum). Fais-le tout de suite après le
premier démarrage : tant que le compte n'existe pas, n'importe qui ayant
accès à la machine peut le créer.

Le mot de passe n'est **jamais stocké en clair** — seul un hash
PBKDF2-SHA256 salé (240 000 itérations) est gardé dans `data.db`. La
session tient dans un cookie signé HMAC, `HttpOnly`, valable 30 jours.

Pour **changer le mot de passe** : onglet *Sources* du dashboard, section
« Compte et sécurité ». Le changement fait tourner la clé de signature,
ce qui déconnecte toutes les sessions ouvertes ailleurs.

Mot de passe perdu ? Il n'est pas récupérable. Supprime le fichier
`data.db` pour repartir de zéro — tu perdras l'historique des relevés.

## Ce qui est vraiment en temps réel

| Source | Fréquence | Réalité |
|---|---|---|
| CoinGecko (crypto) | 5 min | cours spot, quasi temps réel |
| Kraken (quantités) | 5 min | tes soldes réels |
| Yahoo (ETF) | 30 min | **différé d'environ 15 min**, c'est la norme du gratuit |
| TCGdex (cartes FR) | 6 h | cotes Cardmarket en €, recalculées une fois par jour, sans clé |
| PokemonTCG.io (cartes) | 6 h | prix Cardmarket recalculés une fois par jour |
| TCG API (scellé) | 6 h | marché TCGplayer US, converti en € |
| CardTrader (scellé, option) | 6 h | plus basse annonce € d'une marketplace UE |
| GoCardless (banques) | 12 h | l'agrégateur limite les appels quotidiens |
| Montres | — | aucune API gratuite, saisie manuelle |

Le « temps réel » n'existe pas partout. Une carte Pokémon n'a pas de cours
continu : les marketplaces calculent une tendance sur les ventes récentes, une
fois par jour. Interroger plus souvent ne change rien.

## Configurer chaque source

### Kraken — 5 minutes
Paramètres > Sécurité > API > Créer une clé. **Coche uniquement « Query Funds ».**
Pas de trading, pas de retrait. Recopie clé et secret dans `.env`.
Le collecteur remplace alors les quantités estimées par tes vraies quantités.

### GoCardless (LCL, Fortuneo) — 20 minutes
1. Compte gratuit sur bankaccountdata.gocardless.com, récupère `secret_id` et `secret_key`
2. Dans l'app, onglet **Sources** > choisis ta banque > « Obtenir le lien »
3. Le lien t'emmène chez ta banque, tu valides avec ton appli mobile
4. Retour sur l'app, clique « Rattacher » : les comptes sont créés

Le consentement expire au bout de 90 jours, il faudra refaire l'étape 2.
Accès en lecture seule : aucun virement n'est possible avec ces jetons.

### PokemonTCG.io — 2 minutes
Marche sans clé (1 000 appels/jour). Avec une clé gratuite sur dev.pokemontcg.io,
tu passes à 20 000. Recherche une carte dans l'onglet Pokémon, clique, elle
entre dans ta collection avec son image officielle et son prix Cardmarket.

### TCG API (produits scellés) — 2 minutes
Compte gratuit sur tcgapi.dev, récupère la clé, colle-la dans `TCGAPI_KEY`.
100 requêtes/jour suffisent largement pour rafraîchir quelques produits
toutes les 6 h. Une simple clé dans l'en-tête `X-API-Key`, plus d'OAuth.

Les prix sont ceux du marché **TCGplayer (US)**, rendus en dollars et
convertis en euros (taux du jour via frankfurter.app).

### CardTrader — prix européens du scellé (optionnel, 2 minutes)
Pour des prix plus proches du marché français, renseigne `CARDTRADER_KEY` :
compte CardTrader > Settings > API Access > *Create New Token*. Quand la clé
est là, le scellé prend la **plus basse annonce en euros** de CardTrader
(marketplace européenne) au lieu du prix US converti. Repli automatique sur
TCG API si un produit n'est pas trouvé côté CardTrader.

L'API Cardmarket officielle, elle, reste fermée : réservée aux vendeurs
professionnels, validation manuelle, et interroger le price guide au
quotidien pour un usage perso est explicitement interdit par leurs CGU.
Autres options scellé : PriceCharting (payante) ou la saisie manuelle.

### iEstims — import de la collection Pokémon

iEstims (l'appli mobile d'estimation) n'a ni API ni version web : rien ne
peut aller y chercher tes données. En revanche elle exporte en CSV, et
l'onglet Pokémon sait relire ces exports.

Dans l'appli, exporte ton portefeuille, récupère
`portefeuille_cartes.csv` et `portefeuille_items.csv`, puis dépose-les
dans **Pokémon > Importer depuis iEstims** (les deux d'un coup marchent).

**L'import ne sert qu'une fois par carte.** À l'import, chaque carte est
reliée automatiquement à son équivalent TCGdex via sa **série et son
numéro** (« Nuit Noire » + 098 → `me05-098`). Les cartes reliées passent
en source `tcgdex` et leur cote Cardmarket est ensuite rafraîchie toutes
les 6 heures, sans aucune action de ta part.

On ne fait jamais la correspondance par le nom : TCGdex écrit
« Méga-Zeraora-ex » là où iEstims écrit « Mega-zeraora ex ». Série et
numéro sont sans ambiguïté.

Les cartes non reconnues (les promos, surtout, dont la numérotation
diffère d'une source à l'autre) gardent la source `iestims` et le prix
figé de l'export. Pour les basculer en automatique, ouvre la ligne et
renseigne son identifiant TCGdex dans « Code de cours » — une fois, puis
c'est réglé.

Réimporter le même fichier met à jour sans créer de doublon :
l'identifiant de ligne dérive de l'identité de la carte (nom, numéro,
série, version, grading). Deux cartes identiques dans l'export
deviennent une ligne de quantité 2, prix d'achat cumulés.

### Coefficient d'état et de grading

La cote Cardmarket suppose du Near Mint. L'import lit la colonne `État`
et le grading, et en déduit un coefficient appliqué à la cote : une
PSA 10 vaut 4× la cote brute, une carte `Played` 0,5×. Ce sont des
ordres de grandeur du marché, pas des quotations — comme les
estimations d'iEstims. Les barèmes sont en haut de `app/iestims.py` et
le coefficient est stocké par ligne (colonne `coef`), donc ajustable.

### Montres
Chrono24 et WatchCharts ont les cotes, leurs API sont commerciales et chères.
Le catalogue de l'app (15 modèles avec prix boutique et fourchette d'occasion)
est un relevé indicatif mi-2026, à corriger à la main.

## Architecture

```
app/
├── main.py       FastAPI : API + service de toutes les pages statiques
├── auth.py       connexion : hash du mot de passe, cookie de session
├── db.py         SQLite — comptes, lignes, relevés, journal, config
├── collecte.py   un collecteur par source, tous indépendants
└── static/
    ├── connexion.html                       écran de connexion
    ├── etf.json                             catalogue ETF (95 trackers)
    ├── index.html, style.css, script.js     accueil FORGE
    ├── personal.html, career.html           les deux autres chapitres
    ├── base/                                assets du chapitre "personal"
    └── finance.html, finance.css,           dashboard patrimoine
        app.js, visuels.js, retour.html      (chapitre "Finance & Patrimoine")
data.db           créée au premier lancement
```

Le dashboard (`finance.html`/`finance.css`) reprend la palette noir/blanc/rose
(`#FF3B9A`) du reste de FORGE, tout en gardant ses propres couleurs de
catégorie (crypto, ETF, Pokémon, montres) et les couleurs hausse/baisse.

Chaque collecte écrit un relevé par ligne. Au bout de quelques jours, les
courbes ne sont plus des formes générées mais ton historique réel. La base
se purge toute seule : pas fin sur 30 jours, un point par jour au-delà,
400 jours d'archive.

## Sécurité

- `.env` est dans `.gitignore`. Ne le commite jamais.
- `data.db` contient le hash de ton mot de passe : ne le commite pas non plus.
- La clé Kraken n'a que le droit de lecture. Vérifie-le dans ton compte.
- Le serveur écoute sur 127.0.0.1 : il n'est pas exposé sur ton réseau.
- Si tu veux y accéder depuis ton téléphone, passe par un tunnel
  (Tailscale, Cloudflare Tunnel) plutôt que d'ouvrir un port.

## Pistes

- Kraken WebSocket pour un vrai flux continu sur les cryptos
- Export CSV pour ta déclaration de plus-values crypto
- Alertes quand une ligne dépasse un seuil
- Photos de tes produits scellés et de ta montre (upload + stockage local)
