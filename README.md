# Patrimoine

Tableau de bord patrimonial personnel. Un backend Python collecte les cours,
une page servie par le même serveur les affiche. Les clés restent sur ta machine.

## Démarrage

```bash
cd patrimoine
python3 -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # puis remplis ce que tu as
uvicorn app.main:app --reload
```

Puis http://127.0.0.1:8000

Au premier lancement, la base est amorcée avec ton portefeuille actuel
(39 649,87 € pour 31 963 € investis). Tout est modifiable dans l'interface.

## Ce qui est vraiment en temps réel

| Source | Fréquence | Réalité |
|---|---|---|
| CoinGecko (crypto) | 5 min | cours spot, quasi temps réel |
| Kraken (quantités) | 5 min | tes soldes réels |
| Yahoo (ETF) | 30 min | **différé d'environ 15 min**, c'est la norme du gratuit |
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

### Montres
Chrono24 et WatchCharts ont les cotes, leurs API sont commerciales et chères.
Le catalogue de l'app (15 modèles avec prix boutique et fourchette d'occasion)
est un relevé indicatif mi-2026, à corriger à la main.

## Architecture

```
app/
├── main.py       FastAPI : API + service de la page statique
├── db.py         SQLite — comptes, lignes, relevés, journal
├── collecte.py   un collecteur par source, tous indépendants
└── static/       index.html, style.css, app.js, visuels.js
data.db           créée au premier lancement
```

Chaque collecte écrit un relevé par ligne. Au bout de quelques jours, les
courbes ne sont plus des formes générées mais ton historique réel. La base
se purge toute seule : pas fin sur 30 jours, un point par jour au-delà,
400 jours d'archive.

## Sécurité

- `.env` est dans `.gitignore`. Ne le commite jamais.
- La clé Kraken n'a que le droit de lecture. Vérifie-le dans ton compte.
- Le serveur écoute sur 127.0.0.1 : il n'est pas exposé sur ton réseau.
- Si tu veux y accéder depuis ton téléphone, passe par un tunnel
  (Tailscale, Cloudflare Tunnel) plutôt que d'ouvrir un port.

## Pistes

- Kraken WebSocket pour un vrai flux continu sur les cryptos
- Export CSV pour ta déclaration de plus-values crypto
- Alertes quand une ligne dépasse un seuil
- Photos de tes produits scellés et de ta montre (upload + stockage local)
