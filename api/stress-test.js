// Free OpenCode Zen models, tried in order. Space Bunny keeps no data (best
// for students); the others are backups if it is busy or retired.
const MODELS = ["space-bunny-free", "big-pickle", "mimo-v2.6-flash-free"];
const API_URL = "https://opencode.ai/zen/v1/chat/completions";

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

// Accepts the key under either name, since it was first saved as OPENROUTER_API_KEY.
const apiKey = () => (process.env.OPENCODE_API_KEY || process.env.OPENROUTER_API_KEY || "").trim().replace(/^["']|["']$/g, "");

async function ask(model, messages) {
  const t0 = Date.now();
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 8000, reasoning_effort: "low", messages: [{ role: "system", content: SYSTEM }, ...messages] }),
  });
  const data = await r.json().catch(() => ({}));
  console.log("timing", model, r.status, `${Date.now() - t0}ms`, JSON.stringify(data.usage || {}), `reasoning_chars=${(data.choices?.[0]?.message?.reasoning_content || "").length}`);
  return { status: r.status, ok: r.ok && !data.error, data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!apiKey()) {
    return res.status(503).json({ error: "The chat isn't set up yet: the site owner needs to add an OpenCode API key." });
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
    let last, authFailures = 0;
    for (const model of MODELS) {
      last = await ask(model, messages);
      const reply = (last.data.choices?.[0]?.message?.content || "").trim();
      if (last.ok && reply) return res.status(200).json({ reply, model });
      if (last.status === 401 || last.status === 403) authFailures++;
      console.error("OpenCode model failed", model, last.status, JSON.stringify(last.data).slice(0, 300));
    }
    if (authFailures === MODELS.length) {
      return res.status(503).json({ error: "The chat's API key isn't working. The site owner needs to check it." });
    }
    if (last?.status === 429) {
      return res.status(429).json({ error: "The free AI models are busy or at their limit right now. Try again in a few minutes." });
    }
    return res.status(502).json({ error: "The AI service returned an error. Try again shortly." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Couldn't reach the AI service. Try again." });
  }
}
