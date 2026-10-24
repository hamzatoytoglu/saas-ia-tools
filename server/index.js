import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import aiRoutes from './routes/ai.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import adminRoutes from './routes/admin.js';
import { meHandler } from './routes/me.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing'
);
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: process.env.MAX_UPLOAD_BYTES || '5mb' }));

app.use('/api', rateLimit({
  windowMs: 3600_000,
  max: Number(process.env.RATE_LIMIT_PER_HOUR || 50),
  standardHeaders: true,
  keyGenerator: (req) => req.headers.authorization || req.ip,
  handler: (_q, res) => res.status(429).json({ error: 'Limite d\u2019utilisation atteinte. Revenez dans une heure.' })
}));

// Middleware d'authentification : vérifie le JWT Supabase
export async function authenticate(req, res, next){
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifi\u00e9' });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Jeton invalide' });
  req.user = data.user;
  next();
}

// V\u00e9rification du r\u00f4le admin c\u00f4t\u00e9 serveur (jamais depuis le client)
export async function requireAdmin(req, res, next){
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase());
  const { data: prof } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', req.user.id).single();
  if (!prof?.is_admin && !adminEmails.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Acc\u00e8s administrateur requis' });
  }
  next();
}

app.get('/api/config', (_q, res) => res.json({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
}));
app.get('/api/me', authenticate, meHandler);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/billing', authenticate, billingRoutes);
app.use('/api/admin', authenticate, requireAdmin, adminRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use((err, _q, res, _n) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne' });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`NovaAI API sur http://localhost:${PORT}`));
}
export default app;
