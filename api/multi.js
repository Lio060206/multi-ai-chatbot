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
      callGitHub("chatgpt", "openai/gpt-4.1-mini", prompt),
      callGitHub("copilot", "openai/gpt-4o-mini", prompt),

      // Groq models
      callGroq("llama8b", "llama-3.1-8b-instant", prompt),
      callGroq("llama70b", "llama-3.1-70b-versatile", prompt),
      callGroq("mixtral", "mixtral-8x7b", prompt),
      callGroq("deepseek", "deepseek-r1-distill-llama-70b", prompt),
      callGroq("gemma", "gemma-2-9b", prompt),

      // Perplexity
      callPPLX("pplx7b", "pplx-7b-online", prompt),
      callPPLX("pplx70b", "pplx-70b-online", prompt),
    ];

    const results = await Promise.all(tasks);
    res.status(200).json(results);
  } catch (e) {
    console.error("Global error:", e);
    res.status(500).json({ error: "Server error" });
  }
}

/* -----------------------------
   GitHub Models
------------------------------ */
async function callGitHub(provider, model, prompt) {
  try {
    const res = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${process.env.GITHUB_PAT}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return { provider, model, answer };
  } catch (e) {
    return { provider, model, answer: "שגיאה במודל GitHub" };
  }
}

/* -----------------------------
   Groq
------------------------------ */
async function callGroq(provider, model, prompt) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return { provider, model, answer };
  } catch (e) {
    return { provider, model, answer: "שגיאה במודל Groq" };
  }
}

/* -----------------------------
   Perplexity
------------------------------ */
async function callPPLX(provider, model, prompt) {
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PPLX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return { provider, model, answer };
  } catch (e) {
    return { provider, model, answer: "שגיאה במודל Perplexity" };
  }
}
