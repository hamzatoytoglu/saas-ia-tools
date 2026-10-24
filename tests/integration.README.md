# Tests d'intégration bout-en-bout (parcours utilisateur complet)
# Nécessitent un serveur de test + Supabase de test. Lancer : npm test (les tests unitaires ci-dessus passent sans dépendances externes).
#
# Parcours couvert (à exécuter avec un environnement Supabase/Stripe de test) :
# 1. Inscription → profil créé via trigger (50 crédits de bienvenue)
# 2. Connexion → GET /api/me → crédits affichés
# 3. Génération d'image réussie → -10 crédits, sortie affichée
# 4. Génération échouée (FORCE_FAIL) → remboursement automatique, statut 'failed'
# 5. Requêtes concurrentes → spend_credits atomique, pas de solde négatif
# 6. Checkout Stripe → webhook checkout.session.completed → plan + crédits octroyés
# 7. Webhook dupliqué → { duplicate: true }, crédits non re-crédités
# 8. GET /api/admin/stats sans rôle admin → 403
# 9. Prompt modéré (deepfake/nsfw) → 422, aucun crédit débité
# 10. Limite de taux dépassée → 429
#
# Ces scénarios sont implémentés contractuellement dans tests/ai.test.mjs (sans services externes)
# et documentés ici pour exécution d'intégration dès que les clés de test sont fournies.
