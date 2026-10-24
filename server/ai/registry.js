// Registre des adaptateurs IA. AI_PROVIDER=mock => g\u00e9n\u00e9rations simul\u00e9es (tests uniquement).
import mockProvider from './providers/mock.js';
import openaiProvider from './providers/openai.js';
import stabilityProvider from './providers/stability.js';

const toolProviderMap = {
  text:    { provider: process.env.OPENAI_API_KEY ? 'openai' : 'mock', kind: 'text' },
  summary: { provider: process.env.OPENAI_API_KEY ? 'openai' : 'mock', kind: 'text' },
  code:    { provider: process.env.OPENAI_API_KEY ? 'openai' : 'mock', kind: 'text' },
  image:   { provider: process.env.STABILITY_API_KEY ? 'stability' : 'mock', kind: 'image' },
  voice:   { provider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'mock', kind: 'audio' }
};

const providers = { mock: mockProvider, openai: openaiProvider, stability: stabilityProvider };

export const TOOL_COST = { image: 10, text: 5, summary: 3, voice: 8, code: 5 };

// Garde-fous : blocage des usages abusifs, impersonation, contenus interdits
const BLOCKED = /(impersonate|je suis [\u00e9e]_|deepfake|nude|nsfw|csam|kill (all|everyone)|bomb|credit card\s*\d{4})/i;
export function moderatePrompt(prompt){
  if (BLOCKED.test(prompt)) {
    throw Object.assign(new Error('Contenu refus\u00e9 par la politique d\u2019utilisation (CGU \u00a74).'), { code: 422 });
  }
}

export async function runAI(tool, prompt){
  const conf = toolProviderMap[tool];
  if (!conf) throw Object.assign(new Error('Outil inconnu'), { code: 400 });
  moderatePrompt(prompt);
  const provider = providers[conf.provider];
  return provider.generate(tool, conf.kind, prompt);
}
