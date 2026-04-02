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
      callGitHub("copilot", "openai/gpt-4.1-mini", prompt),
      callGitHub("claude", "anthropic/claude-3-sonnet", prompt),   // ← מודל קיים
      callGemini(prompt),                                           // ← מודל קיים
      callGroq("grok_like", "llama-3.1-8b-instant", prompt),
    ];

    const results = await Promise.all(tasks);
    res.status(200).json(results);
  } catch (e) {
    console.error("Global error:", e);
    res.status(500).json({ error: "Server error" });
  }
}

/* -----------------------------
   GitHub Models (ChatGPT / Copilot / Claude)
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

    if (!res.ok) {
      console.error("GitHub error for", provider, data);
      return {
        provider,
        model,
        answer: `שגיאה במודל ${provider}: ${JSON.stringify(data)}`,
      };
    }

    const answer = data.choices?.[0]?.message?.content || "";
    return { provider, model, answer };
  } catch (e) {
    console.error("GitHub exception for", provider, e);
    return {
      provider,
      model,
      answer: `שגיאה במודל ${provider} (חריג)`,
    };
  }
}

/* -----------------------------
   Gemini (Google AI Studio)
------------------------------ */
async function callGemini(prompt) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini error:", data);
      return {
        provider: "gemini",
        model: "gemini-1.0-pro",
        answer: `שגיאה במודל gemini: ${JSON.stringify(data)}`,
      };
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { provider: "gemini", model: "gemini-1.0-pro", answer };
  } catch (e) {
    console.error("Gemini exception:", e);
    return {
      provider: "gemini",
      model: "gemini-1.0-pro",
      answer: "שגיאה במודל gemini (חריג)",
    };
  }
}

/* -----------------------------
   Groq (Grok-like)
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

    if (!res.ok) {
      console.error("Groq error:", data);
      return {
        provider,
        model,
        answer: `שגיאה במודל ${provider}: ${JSON.stringify(data)}`,
      };
    }

    const answer = data.choices?.[0]?.message?.content || "";
    return { provider, model, answer };
  } catch (e) {
    console.error("Groq exception:", e);
    return {
      provider,
      model,
      answer: `שגיאה במודל ${provider} (חריג)`,
    };
  }
}
