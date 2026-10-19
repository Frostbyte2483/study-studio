const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const key = Netlify.env.get("GROQ_API_KEY");
  if (!key) return json({ error: "GROQ_API_KEY is not set" }, 500);

  let prompt;
  try { ({ prompt } = await req.json()); } catch { return json({ error: "Bad request" }, 400); }
  if (typeof prompt !== "string" || prompt.length < 20 || prompt.length > 20000)
    return json({ error: "Prompt must be 20 to 20,000 characters" }, 400);

  const model = Netlify.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: "You reply with only valid JSON. No explanations and no code fences." },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!r.ok) return json({ error: "AI request failed" }, r.status === 429 ? 429 : 502);

  const d = await r.json();
  const raw = d?.choices?.[0]?.message?.content ?? "";
  const m = raw.match(/[\[{][\s\S]*[\]}]/);
  return json({ text: m ? m[0] : raw });
};
