import OpenAI from "openai";

// OpenAI is optional — if not configured, AI features will be disabled
const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

export const isOpenAIConfigured = !!apiKey;
