// Adaptateur Stability AI (images). N\u00e9cessite STABILITY_API_KEY.
export default {
  async generate(_tool, kind, prompt){
    if (kind !== 'image') throw new Error('Fournisseur Stability : type non support\u00e9');
    const r = await fetch('https://api.stability.ai/v2/generation/stable-image/core', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`, 'Accept': 'application/json' },
      body: new URLSearchParams({ prompt })
    });
    if (!r.ok) throw new Error(`Stability erreur ${r.status}`);
    const data = await r.json();
    return { url: `data:image/png;base64,${data.image}`, provider: 'stability' };
  }
};
