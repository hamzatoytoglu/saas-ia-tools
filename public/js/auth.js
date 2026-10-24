import { getSupabase } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const toggle = document.getElementById('toggle');
  const title = document.getElementById('form-title');
  const btn = document.getElementById('submit-btn');
  const msg = document.getElementById('auth-msg');
  let mode = 'signin';

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    mode = mode === 'signin' ? 'signup' : 'signin';
    title.textContent = mode === 'signin' ? 'Connexion' : 'Inscription';
    btn.textContent = mode === 'signin' ? 'Se connecter' : 'Créer le compte';
    toggle.textContent = mode === 'signin' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.style.display = 'none';
    btn.disabled = true;
    try {
      const sb = await getSupabase();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const { error } = mode === 'signin'
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
      if (error) throw error;
      location.href = '/dashboard.html';
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
      btn.disabled = false;
    }
  });
});
