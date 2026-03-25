import { buildSystemPrompt } from '../data/systemPrompt';

export async function callClaude(rep, conversationHistory) {
  const systemPrompt = buildSystemPrompt(rep);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, history: conversationHistory }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

export function isKeyConfigured() {
  return true;
}
