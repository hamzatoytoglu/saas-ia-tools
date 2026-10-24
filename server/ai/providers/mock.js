// Fournisseur simul\u00e9 : UNIQUEMENT pour les tests et le d\u00e9veloppement sans cl\u00e9.
// Ne jamais pr\u00e9senter une sortie de ce fournisseur comme une g\u00e9n\u00e9ration de production r\u00e9elle.
export default {
  async generate(tool, kind, prompt){
    if (prompt.toUpperCase().includes('FORCE_FAIL')) {
      throw new Error('G\u00e9n\u00e9ration \u00e9chou\u00e9e (fournisseur simul\u00e9)');
    }
    if (kind === 'image') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect fill="#1c2438" width="512" height="512"/><text x="50%" y="50%" fill="#8b7ce7" font-size="20" text-anchor="middle" font-family="sans-serif">MOCK: ${prompt.slice(0,40)}</text></svg>`;
      return { url: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), provider: 'mock' };
    }
    if (kind === 'audio') return { url: 'data:audio/wav;base64,UklGRg==', provider: 'mock' };
    return { text: `[SIMULATION \u2014 ${tool}] R\u00e9ponse simul\u00e9e \u00e0 : \u00ab ${prompt.slice(0, 120)} \u00bb`, provider: 'mock' };
  }
};
