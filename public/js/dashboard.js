import { requireAuth, getSupabase, api } from './app.js';

const OUT = { image:'out-image', text:'out-text', summary:'out-summary', voice:'out-voice', code:'out-code' };
const INPUT = { image:'img-prompt', text:'text-prompt', summary:'summary-input', voice:'voice-input', code:'code-input' };

async function refreshCredits(){
  const me = await api('/me');
  document.getElementById('credits-badge').textContent = me.credits + ' crédits';
  document.getElementById('plan-info').textContent = 'Plan : ' + (me.plan || 'gratuit');
  if (me.is_admin) document.getElementById('admin-link').classList.remove('hidden');
}

async function generate(tool, btn){
  const out = document.getElementById(OUT[tool]);
  const prompt = document.getElementById(INPUT[tool]).value.trim();
  if (!prompt || prompt.length > 4000) { out.textContent = 'Prompt requis (max 4000 caractères).'; return; }
  btn.disabled = true; out.textContent = '⏳ Génération en cours…';
  try {
    const res = await api('/ai/'+tool, { method:'POST', body:{ prompt } });
    if (tool === 'image') out.innerHTML = '<img src="'+res.url+'" alt="image générée">';
    else if (tool === 'voice') out.innerHTML = '<audio controls src="'+res.url+'"></audio>';
    else out.textContent = res.text;
    await refreshCredits(); // crédit déduit après succès
  } catch (err) {
    out.innerHTML = '<span class="badge err">'+err.message+' (crédits remboursés si débités)</span>';
    await refreshCredits();
  } finally { btn.disabled = false; }
}

document.addEventListener('DOMContentLoaded', async () => {
  try { await requireAuth(); } catch { return; }
  try { await refreshCredits(); } catch { location.href='/login.html'; return; }

  document.querySelectorAll('.generate').forEach(btn =>
    btn.addEventListener('click', () => generate(btn.dataset.tool, btn)));

  document.querySelectorAll('.subscribe').forEach(btn =>
    btn.addEventListener('click', async () => {
      try {
        const { url } = await api('/billing/checkout', { method:'POST', body:{ plan: btn.dataset.plan } });
        location.href = url;
      } catch (e) { alert(e.message); }
    })
  );

  document.getElementById('btn-billing').addEventListener('click', async () => {
    try { const { url } = await api('/billing/portal', { method:'POST' }); location.href = url; }
    catch (e) { alert(e.message); }
  });

  document.getElementById('logout').addEventListener('click', async (e) => {
    e.preventDefault();
    (await getSupabase()).auth.signOut();
    location.href = '/';
  });
});
