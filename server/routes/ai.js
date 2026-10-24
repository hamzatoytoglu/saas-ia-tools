// Route g\u00e9n\u00e9ration : d\u00e9duit les cr\u00e9dits AVANT, rembourse en cas d'\u00e9chec.
import { Router } from 'express';
import { supabaseAdmin } from '../index.js';
import { runAI, TOOL_COST } from '../ai/registry.js';

const router = Router();
const VALID_TOOLS = Object.keys(TOOL_COST);

function validatePrompt(prompt){
  if (typeof prompt !== 'string' || !prompt.trim()) throw Object.assign(new Error('Prompt requis'), { code: 400 });
  if (prompt.length > 4000) throw Object.assign(new Error('Prompt trop long (max 4000 caract\u00e8res)'), { code: 422 });
}

// D\u00e9duction atomique en base (voir fonction SQL spend_credits)
async function deduct(userId, cost){
  const { data, error } = await supabaseAdmin.rpc('spend_credits', { p_user: userId, p_cost: cost });
  if (error || !data) {
    throw Object.assign(new Error('Cr\u00e9dits insuffisants'), { code: 402 });
  }
}

async function refund(userId, cost, reason){
  await supabaseAdmin.rpc('refund_credits', { p_user: userId, p_amount: cost, p_reason: reason });
}

router.post('/:tool', async (req, res) => {
  const { tool } = req.params;
  const cost = TOOL_COST[tool];
  try {
    if (!VALID_TOOLS.includes(tool)) return res.status(400).json({ error: 'Outil inconnu' });
    validatePrompt(req.body?.prompt);
    await deduct(req.user.id, cost); // d\u00e9bit avant appel
    try {
      const result = await runAI(tool, req.body.prompt);
      await supabaseAdmin.from('generations').insert({
        user_id: req.user.id, tool, cost, status: 'success'
      });
      return res.json(result);
    } catch (err) {
      await refund(req.user.id, cost, 'g\u00e9n\u00e9ration \u00e9chou\u00e9e'); // remboursement automatique
      await supabaseAdmin.from('generations').insert({
        user_id: req.user.id, tool, cost, status: 'failed'
      });
      return res.status(err.code === 422 ? 422 : 502).json({ error: err.message, refunded: true });
    }
  } catch (err) {
    return res.status(err.code || 500).json({ error: err.message });
  }
});

export default router;
