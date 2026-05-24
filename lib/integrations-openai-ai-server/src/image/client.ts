import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function analyzeImage(imageBase64: string, prompt: string): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured — set OPENAI_API_KEY in .env");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 1000,
  });
  return response.choices[0]?.message?.content ?? "";
}
