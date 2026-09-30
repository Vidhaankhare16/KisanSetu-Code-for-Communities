import { SpeakRequestSchema } from "@/contracts/api";
import { synthesizeSpeech } from "@/server/ai/speech";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

export const POST = apiHandler({ body: SpeakRequestSchema, cost: 3 }, async ({ body }) => {
  const wav = await synthesizeSpeech(body.text);
  return new Response(new Uint8Array(wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" },
  });
});

export const OPTIONS = corsPreflight;
