import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured — set OPENAI_API_KEY in .env");
  const tmpFile = join(tmpdir(), `audio-${randomUUID()}.webm`);
  await writeFile(tmpFile, audioBuffer);
  try {
    const file = await toFile(await readFile(tmpFile), "audio.webm", { type: "audio/webm" });
    const result = await openai.audio.transcriptions.create({ model: "whisper-1", file });
    return result.text;
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}
