import { supabaseAdmin } from '../index.js';

export async function meHandler(req, res){
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('credits, plan, is_admin, created_at')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(500).json({ error: 'Profil introuvable' });
  res.json({ ...data, is_admin: !!data.is_admin, email: req.user.email });
}
