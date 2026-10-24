// Adaptateur OpenAI (texte). N\u00e9cessite OPENAI_API_KEY.
export default {
  async generate(tool, kind, prompt){
    if (kind !== 'text') throw new Error('Fournisseur OpenAI : type non support\u00e9');
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `Tu es un assistant. T\u00e2che : ${tool}. R\u00e9ponds en fran\u00e7ais.` },
          { role: 'user', content: prompt }
        ]
      })
    });
    if (!r.ok) throw new Error(`OpenAI erreur ${r.status}`);
    const data = await r.json();
    return { text: data.choices[0].message.content, provider: 'openai' };
  }
};
