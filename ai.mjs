// Netlify Function: keeps your Gemini API key on the server, never in the page.
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const key = Netlify.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "GEMINI_API_KEY is not set" }, 500);

  let prompt;
  try { ({ prompt } = await req.json()); } catch { return json({ error: "Bad request" }, 400); }
  if (typeof prompt !== "string" || prompt.length < 20 || prompt.length > 20000)
    return json({ error: "Prompt must be 20 to 20,000 characters" }, 400);

  const model = Netlify.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );
  if (!r.ok) return json({ error: "AI request failed" }, r.status === 429 ? 429 : 502);

  const d = await r.json();
  const text = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return json({ text });
};
