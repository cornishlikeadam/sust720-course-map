# SUST 720 Interactive Course Map

DIGI 230 Milestone 1: an interactive map of SCAD SUST 720 "Designing in Deep Time", showing where AI enters the course, where it stays out, and who decides. It's due October 1.

- **Live site:** https://sust720-course-map.vercel.app (Vercel project `sust720-course-map`)
- **Repo:** https://github.com/cornishlikeadam/sust720-course-map (public)

## Files
- `index.html`: the whole page as a single file, with no build step. It has five switchable layers: Territory, People, AI touchpoints, Hand-offs and Decision power. The course data lives in the `R` (steps), `P` (people) and `CARDS` (evidence) arrays in the script at the bottom, and the SVG map is drawn from those arrays.
- `api/stress-test.js`: a Vercel serverless function behind the Stress-test chat. It calls free OpenCode Zen models (space-bunny-free, then big-pickle, then mimo-v2.6-flash-free), uses no dependencies, and reads its key from the `OPENCODE_API_KEY` or `OPENROUTER_API_KEY` Vercel environment variable.
- `PROMPT.md`: the prompt for rebuilding or extending the map.

## Course rules the map encodes (don't break these)
- AI is used in one place only: Step 2 (Stress-test / volatility modeling).
- Steps 1 and 4 are non-use boundaries.
- Steps 1, 3 and 5 are preserve-human-judgment zones.
- Every AI-proposed shock needs 2 peer-reviewed papers before the team adopts it. The Student Team decides, and faculty can override.
- The team removed all Indigenous-knowledge content on purpose. Don't add it back.
- Tag claims as evidence, assumption or proposed test. Never invent citations.
- The brief's rule for the page: "Text supports the map. Text does not lead."

## Deploy
- Deploy with `vercel deploy --prod` from this folder. The API key is never committed.
- The PDF deliverable is exported with headless Chrome using `--print-to-pdf`. Print styles hide the chat and show every step's details. It must be named `[TeamName]_M1_CourseMap.pdf`, with the live link on page 1.
