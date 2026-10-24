// NovaAI — utilitaires partagés
let cfg;
async function getConfig(){
  if(!cfg) cfg = await (await fetch('/api/config')).json(); // { supabaseUrl, supabaseAnonKey }
  return cfg;
}
let sbPromise;
export async function getSupabase(){
  if(!sbPromise){
    const c = await getConfig();
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sbPromise = createClient(c.supabaseUrl, c.supabaseAnonKey);
  }
  return sbPromise;
}
export async function requireAuth(){
  const sb = await getSupabase();
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.href='/login.html'; throw new Error('unauthenticated'); }
  return session;
}
export async function api(path, opts={}){
  const sb = await getSupabase();
  const { data:{ session } } = await sb.auth.getSession();
  const r = await fetch('/api'+path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type':'application/json',
      ...(session ? { Authorization:'Bearer '+session.access_token } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || 'Erreur '+r.status);
  return data;
}
