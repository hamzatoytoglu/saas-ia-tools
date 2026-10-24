# SaaS IA Tools

Application SaaS complète : landing page, dashboard, 5 outils IA, authentification Supabase, système de crédits, abonnements Stripe, espace administrateur.

## Structure

- `public/` : frontend HTML / CSS / JS (landing, login, dashboard, admin, pages légales)
- `server/` : API Express (routes, adaptateurs IA, webhooks Stripe)
- `db/migrations.sql` : schéma SQL, politiques RLS, fonctions crédits
- `tests/` : tests automatisés (fournisseurs IA simulés uniquement)

## Installation locale

```bash
cp .env.example .env   # puis remplir les valeurs
cd server && npm install && cd ..
npm run migrate     # applique db/migrations.sql
npm run dev         # http://localhost:3000
```

## Scripts

- `npm run dev` / `npm start` : serveur de développement / production
- `npm test` : tests automatisés
- `npm run migrate` : migrations SQL

## Configuration Supabase

1. Créez un projet sur supabase.com
2. SQL Editor → collez `db/migrations.sql` → Run (tables, RLS, fonctions)
3. Copiez `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` depuis Settings → API

## Configuration Stripe

1. Créez 3 prix récurrents (starter / pro / business) et copiez les identifiants dans `.env`
2. Webhook local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Événements : `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
   - Idempotent : les doublons sont ignorés via la table `webhook_events`

## Clés API requises (dans `.env` uniquement, jamais commitées)

- Supabase : URL + anon key + service role key (obligatoire)
- Stripe : secret key + webhook secret + price IDs (obligatoire pour abonnements)
- OpenAI, Stability AI, ElevenLabs : optionnels — mode simulé tant que la clé manque

## Sécurité

- RLS sur toutes les tables, rôle admin vérifié côté serveur
- Clés de service uniquement côté serveur
- Webhooks Stripe vérifiés par signature + idempotence
- Limites de taux, validation des entrées et fichiers, garde-fous anti-abus (voir CGU §4)
- `.env.example` sans aucune valeur secrète

## Tests couverts

Génération réussie / échouée, déduction et remboursement de crédits, requêtes concurrentes, paiement confirmé + webhook dupliqué, accès admin non autorisé, validation des fichiers, limites d'utilisation, parcours utilisateur complet.

⚠️ Les fournisseurs simulés servent uniquement aux tests. En production, les appels vont aux vraies API dès que les clés sont configurées.
