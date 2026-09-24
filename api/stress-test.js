import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "The chat isn't set up yet: the site owner needs to add an Anthropic API key." });
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
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages,
    });
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "I can't help with that one. Try rephrasing it around your system and the shocks you want to test." });
    }
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return res.status(200).json({ reply: reply || "No reply came back. Try again." });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Too many people are chatting right now. Wait a minute and try again." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(503).json({ error: "The chat's API key isn't working. The site owner needs to check it." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return res.status(502).json({ error: "The AI service returned an error. Try again shortly." });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong on the server. Try again." });
  }
}
