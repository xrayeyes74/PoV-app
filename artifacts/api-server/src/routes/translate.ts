import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

router.post("/", async (req, res) => {
  const { strings, targetLanguage } = req.body;

  if (!strings || !targetLanguage) {
    res.status(400).json({ error: "Missing strings or targetLanguage" });
    return;
  }

  if (targetLanguage === "it") {
    res.json(strings);
    return;
  }

  if (!anthropic) {
    res.status(503).json({ error: "Anthropic API not configured — set ANTHROPIC_API_KEY in .env" });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Translate all string values in this JSON object to the language with code "${targetLanguage}".
Rules:
- Keep all JSON keys exactly as-is
- Translate only the string values
- Keep proper nouns like "Street View", "POI", "AR", "AI", "PoV!" unchanged
- Return ONLY valid JSON, no markdown, no explanation, no backticks

JSON to translate:
${JSON.stringify(strings)}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const translated = JSON.parse(text);
    res.json(translated);
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

export default router;
