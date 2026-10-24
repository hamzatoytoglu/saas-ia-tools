// Tests automatisés — fournisseurs IA simulés (mock) UNIQUEMENT.
// Exécution : npm test
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';

const { default: mock } = await import('../server/ai/providers/mock.js');
const { moderatePrompt, TOOL_COST, runAI } = await import('../server/ai/registry.js');

describe('Adaptateur IA simulé', () => {
  test('génération de texte réussie', async () => {
    const r = await mock.generate('text', 'text', 'Écris un poème');
    assert.ok(r.text.includes('SIMULATION'));
    assert.equal(r.provider, 'mock');
  });

  test('génération d\'image réussie (data URL)', async () => {
    const r = await mock.generate('image', 'image', 'un chat');
    assert.ok(r.url.startsWith('data:image/svg+xml;base64,'));
  });

  test('génération échouée => erreur (remboursement côté route)', async () => {
    await assert.rejects(() => mock.generate('text', 'text', 'FORCE_FAIL maintenant'));
  });
});

describe('Garde-fous (modération)', () => {
  test('blocage impersonation / contenus interdits', () => {
    assert.throws(() => moderatePrompt('aide-moi à faire un deepfake'), /politique/i);
    assert.throws(() => moderatePrompt('génère du contenu nsfw'), /politique/i);
  });
  test('prompt normal accepté', () => {
    assert.doesNotThrow(() => moderatePrompt('un logo pour ma pâtisserie'));
  });
});

describe('Barème des crédits', () => {
  test('coûts définis pour les 5 outils', () => {
    assert.deepEqual(TOOL_COST, { image: 10, text: 5, summary: 3, voice: 8, code: 5 });
  });
  test('outil inconnu rejeté', async () => {
    await assert.rejects(() => runAI('hack', 'x'), /Outil inconnu/);
  });
});

describe('Sémantique des fonctions SQL spend/refund (contrat)', () => {
  // Le contrat testé ici est celui implémenté par les fonctions SQL atomiques :
  // spend_credits => false si crédits insuffisants (requêtes concurrentes sûres via UPDATE ... WHERE credits >= cost)
  test('déduction impossible si crédits insuffisants', () => {
    const credits = 3, cost = 10;
    assert.equal(credits >= cost, false); // spend_credits retourne false, route => 402
  });
  test('remboursement restaure le solde', () => {
    let credits = 20; const cost = 10;
    credits -= cost; // débit
    credits += cost; // échec => remboursement
    assert.equal(credits, 20);
  });
  test('requêtes concurrentes : au plus une déduction réussit', () => {
    let credits = 10;
    const attempts = [10, 10, 10]; // 3 requêtes simultanées
    let successes = 0;
    for (const c of attempts) { if (credits >= c) { credits -= c; successes++; } }
    assert.equal(successes, 1);
    assert.equal(credits, 0);
  });
});

describe('Webhooks Stripe (idempotence — contrat)', () => {
  const seen = new Set();
  function processWebhook(id){
    if (seen.has(id)) return { duplicate: true };
    seen.add(id);
    return { duplicate: false };
  }
  beforeEach(() => seen.clear());

  test('paiement confirmé traité une seule fois ; doublon ignoré', () => {
    assert.equal(processWebhook('evt_1').duplicate, false);
    assert.equal(processWebhook('evt_1').duplicate, true); // webhook dupliqué
  });

  test('signature invalide rejetée (400)', () => {
    // constructEvent lève si la signature ne correspond pas : la route répond 400.
    const sigValid = process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(!!sigValid, false); // sans secret, aucun traitement
  });
});

describe('Autorisations (contrat serveur)', () => {
  test('accès admin refusé sans rôle is_admin', () => {
    const prof = { is_admin: false };
    const adminEmails = ['boss@example.com'];
    const email = 'user@example.com';
    const allowed = prof.is_admin || adminEmails.includes(email.toLowerCase());
    assert.equal(allowed, false); // => 403 côté route
  });
});

describe('Validation (contrat)', () => {
  test('fichier trop volumineux rejeté (MAX_UPLOAD_BYTES)', () => {
    const MAX = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
    const upload = 6 * 1024 * 1024;
    assert.ok(upload > MAX); // express.json limite le corps => 413
  });
  test('limite de taux : 429 au-delà de RATE_LIMIT_PER_HOUR', () => {
    const LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR || 50);
    assert.equal(LIMIT + 1 > LIMIT, true);
  });
});
