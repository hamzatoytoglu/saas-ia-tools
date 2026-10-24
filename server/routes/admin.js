import { Router } from 'express';
import { supabaseAdmin } from '../index.js';

const router = Router();

router.get('/stats', async (req, res) => {
  const { data: users, error: e1 } = await supabaseAdmin
    .from('profiles').select('id, credits, plan, is_admin, created_at')
    .order('created_at', { ascending: false }).limit(100);
  if (e1) return res.status(500).json({ error: 'Lecture utilisateurs \u00e9chou\u00e9e' });

  const emails = {};
  await Promise.all(users.map(async u => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(u.id);
    if (data?.user) emails[u.id] = data.user.email;
  }));

  const { data: generations } = await supabaseAdmin
    .from('generations')
    .select('user_id, tool, status, cost, created_at')
    .order('created_at', { ascending: false }).limit(50);

  res.json({
    users: users.map(u => ({ ...u, email: emails[u.id] || '?' })),
    generations: (generations || []).map(g => ({ ...g, user_email: emails[g.user_id] || '?' }))
  });
});

export default router;
