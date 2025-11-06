import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('[OpenAI] Falta OPENAI_API_KEY en .env');
  process.exit(1);
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const client = new OpenAI({ apiKey });

export async function complete(prompt, opts = {}) {
  const {
    system = null,
    temperature = 0.4,
    max_tokens = 280,
    model = MODEL,
  } = opts;

  const messages = system
    ? [{ role: 'system', content: system }, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];

  const res = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });

  return res.choices?.[0]?.message?.content?.trim() || '';
}
