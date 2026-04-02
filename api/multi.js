export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const tasks = [
      callOR("chatgpt", "openai/gpt-4.1-mini", prompt),
      callOR("claude", "anthropic/claude-3.5-sonnet", prompt),
      callOR("gemini", "google/gemini-1.5-flash", prompt),
      callOR("deepseek", "deepseek/deepseek-chat", prompt),
      callOR("llama", "meta-llama/llama-3.1-8b-instruct", prompt),
      callOR("grok", "x-ai/grok-beta", prompt),
    ];

    const results = await Promise.all(tasks);
    res.status(200).json(results);
  } catch (e) {
    console.error("Global error:", e);
    res.status(500).json({ error: "Server error" });
  }
}

/* -----------------------------
   OpenRouter – כל המודלים
------------------------------ */
async function callOR(provider, model, prompt) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("OpenRouter error for", provider, data);
      return {
        provider,
        model,
        answer: `שגיאה במודל ${provider}: ${JSON.stringify(data)}`,
      };
    }

    const answer = data.choices?.[0]?.message?.content || "";
    return { provider, model, answer };
  } catch (e) {
    console.error("OpenRouter exception for", provider, e);
    return {
      provider,
      model,
      answer: `שגיאה במודל ${provider} (חריג)`,
    };
  }
}
