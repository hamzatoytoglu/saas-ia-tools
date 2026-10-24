// Checkout Stripe + portail client. Les cr\u00e9dits/plan sont cr\u00e9dit\u00e9s uniquement par le webhook v\u00e9rifi\u00e9.
import { Router } from 'express';
import { stripe, supabaseAdmin } from '../index.js';

const router = Router();
const PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS
};

router.post('/checkout', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe non configur\u00e9 (STRIPE_SECRET_KEY manquante)' });
  const plan = req.body?.plan;
  const price = PRICES[plan];
  if (!price) return res.status(400).json({ error: 'Plan invalide' });
  const { data: prof } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', req.user.id).single();
  let customerId = prof?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: req.user.email, metadata: { user_id: req.user.id } });
    customerId = customer.id;
    await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', req.user.id);
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${req.protocol}://${req.get('host')}/dashboard.html`,
    cancel_url: `${req.protocol}://${req.get('host')}/dashboard.html`
  });
  res.json({ url: session.url });
});

router.post('/portal', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe non configur\u00e9' });
  const { data: prof } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', req.user.id).single();
  if (!prof?.stripe_customer_id) return res.status(400).json({ error: 'Aucun abonnement actif' });
  const session = await stripe.billingPortal.sessions.create({
    customer: prof.stripe_customer_id,
    return_url: `${req.protocol}://${req.get('host')}/dashboard.html`
  });
  res.json({ url: session.url });
});

export default router;
