import { requireAuth, api } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  try { await requireAuth(); } catch { return; }
  try {
    const data = await api('/admin/stats');
    document.querySelector('#users-table tbody').innerHTML = data.users.map(u =>
      `<tr><td>${u.email}</td><td>${u.plan||'gratuit'}</td><td>${u.credits}</td><td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td></tr>`).join('');
    document.querySelector('#gen-table tbody').innerHTML = data.generations.map(g =>
      `<tr><td>${g.user_email}</td><td>${g.tool}</td><td><span class="badge ${g.status==='success'?'ok':'err'}">${g.status}</span></td><td>${g.cost}</td><td>${new Date(g.created_at).toLocaleString('fr-FR')}</td></tr>`).join('');
  } catch (e) {
    document.body.insertAdjacentHTML('beforeend', '<div class="container"><p class="badge err">Accès refusé : '+e.message+'</p></div>');
  }
});
