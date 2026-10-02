/**
 * Spoken answers with Gemini text-to-speech — natural voices in Hindi and other Indian
 * languages for farmers who prefer listening to reading.
 */
import "server-only";
import { Modality } from "@google/genai";
import { stableHash } from "@/domain/hash";
import { TtlCache } from "@/server/cache";
import { env } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { getGenAI, withRetry } from "./gemini";

const VOICE = "Kore";
const cache = new TtlCache<Buffer>(24 * 60 * 60 * 1000, 200);

/** Returns a playable WAV file for `text`. */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  return cache.getOrLoad(stableHash(text), async () => {
    const res = await withRetry("speech.synthesize", () =>
      getGenAI().models.generateContent({
        model: env().GEMINI_TTS_MODEL,
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    );
    const audio = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!audio?.data) throw new AppError("ai_unavailable", "Speech synthesis returned no audio");
    const bytes = Buffer.from(audio.data, "base64");
    const mime = audio.mimeType ?? "";
    if (mime.includes("wav")) return bytes;
    // Raw 16-bit PCM (e.g. "audio/L16;codec=pcm;rate=24000") → wrap in a WAV header.
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    return pcmToWav(bytes, rate);
  });
}

export function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
