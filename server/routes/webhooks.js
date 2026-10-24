// Webhooks Stripe : signature v\u00e9rifi\u00e9e + idempotence via webhook_events.
import { Router } from 'express';
import { stripe, supabaseAdmin } from '../index.js';

const router = Router();
const PLAN_CREDITS = { starter: 200, pro: 1000, business: 5000 };
const PRICE_TO_PLAN = Object.fromEntries([
  ['starter', process.env.STRIPE_PRICE_STARTER],
  ['pro', process.env.STRIPE_PRICE_PRO],
  ['business', process.env.STRIPE_PRICE_BUSINESS]
].filter(([, v]) => v).map(([plan, price]) => [price, plan]));

async function isProcessed(eventId){
  const { data } = await supabaseAdmin.from('webhook_events').select('id').eq('id', eventId).maybeSingle();
  return !!data;
}

router.post('/stripe', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe non configur\u00e9' });
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Signature webhook invalide : ${err.message}` });
  }

  if (await isProcessed(event.id)) return res.json({ received: true, duplicate: true }); // webhook dupliqu\u00e9 ignor\u00e9

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.customer_details?.metadata?.user_id || session.metadata?.user_id;
        const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('stripe_customer_id', session.customer).single();
        const uid = userId || prof?.id;
        if (uid) {
          await supabaseAdmin.from('profiles').update({ plan: session.metadata?.plan || 'starter' }).eq('id', uid);
          await supabaseAdmin.rpc('grant_credits', { p_user: uid, p_amount: PLAN_CREDITS[session.metadata?.plan] || 200, p_reason: 'abonnement' });
        }
        break;
      }
      case 'invoice.paid': {
        // renouvellement mensuel : re-cr\u00e9ditation
        const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('stripe_customer_id', event.data.object.customer).single();
        if (prof) await supabaseAdmin.rpc('grant_credits', { p_user: prof.id, p_amount: PLAN_CREDITS[PRICE_TO_PLAN[event.data.object.lines?.data?.[0]?.price?.id]] || 0, p_reason: 'renouvellement' });
        break;
      }
      case 'customer.subscription.deleted': {
        const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('stripe_customer_id', event.data.object.customer).single();
        if (prof) await supabaseAdmin.from('profiles').update({ plan: 'gratuit' }).eq('id', prof.id);
        break;
      }
    }
    await supabaseAdmin.from('webhook_events').insert({ id: event.id, type: event.type });
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error', err);
    res.status(500).json({ error: 'Traitement webhook \u00e9chou\u00e9' }); // Stripe retentera
  }
});

export default router;
