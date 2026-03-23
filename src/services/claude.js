import { buildSystemPrompt } from '../data/systemPrompt';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "YOUR_ANTHROPIC_API_KEY";

export async function callClaude(rep, conversationHistory) {
  const systemPrompt = buildSystemPrompt(rep);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");
}

export function isKeyConfigured() {
  return ANTHROPIC_KEY !== "YOUR_ANTHROPIC_API_KEY" && ANTHROPIC_KEY.length > 0;
}
