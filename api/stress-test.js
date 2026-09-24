// Free OpenRouter models, tried in order. Free models come and go; if one is
// retired or rate-limited, OpenRouter falls through to the next, ending with
// its own router that picks any available free model.
const MODELS = ["google/gemma-4-31b-it:free", "qwen/qwen3.8-27b:free", "openrouter/free"];

const SYSTEM = `You are the Stress-Test partner for SCAD SUST 720 "Designing in Deep Time", Step 2 (Superforecasting & Volatility Modeling). This is the only step in the course where AI is allowed.

Your job: help graduate students process their ideas by proposing candidate compound, non-linear climate shocks over a 500-year horizon (e.g. salinity inversion, permafrost thaw, ocean acidification, biome migration lag) and tracing how they cascade through the student's system.

Rules:
- Everything you propose is a hypothesis, not a prediction. Label each shock as a candidate.
- For every shock, name the kind of peer-reviewed empirical evidence the Research Lead should look for. The course rule is that no shock is adopted until the students find 2 peer-reviewed papers supporting it. Never invent citations; describe what to search for instead.
- Ask the student one sharp question back that tests their resilience hypothesis.
- The Student Team decides which shock to simulate. Do not pick for them, design their system, or grade their work.
- Keep answers short and scannable: at most 3 candidate shocks per reply.`;

const MAX_TURNS = 20;
const MAX_CHARS = 4000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: "The chat isn't set up yet: the site owner needs to add an OpenRouter API key." });
  }

  const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Send a message to start." });
  }

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sust720-course-map.vercel.app",
        "X-Title": "SUST 720 Stress-Test Chat",
      },
      body: JSON.stringify({ models: MODELS, max_tokens: 1500, messages: [{ role: "system", content: SYSTEM }, ...messages] }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 429) {
      return res.status(429).json({ error: "The free AI limit has been reached for now (about 50 messages a day on the free tier). Try again later." });
    }
    if (r.status === 401 || r.status === 403) {
      return res.status(503).json({ error: "The chat's API key isn't working. The site owner needs to check it." });
    }
    if (!r.ok || data.error) {
      console.error("OpenRouter error", r.status, JSON.stringify(data.error || data).slice(0, 500));
      return res.status(502).json({ error: "The AI service returned an error. Try again shortly." });
    }
    const reply = (data.choices?.[0]?.message?.content || "").trim();
    return res.status(200).json({ reply: reply || "No reply came back. Try again.", model: data.model });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Couldn't reach the AI service. Try again." });
  }
}
