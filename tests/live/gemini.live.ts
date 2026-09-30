import { describe, expect, it } from "vitest";
import { z } from "zod";
import { generateStructured, toGeminiSchema } from "@/server/ai/gemini";
import { isAiConfigured } from "@/server/config/env";

describe.skipIf(!isAiConfigured())("Gemini structured output", () => {
  it("returns schema-valid JSON", async () => {
    const schema = z.object({ headline: z.string(), bullets: z.array(z.string()).min(1).max(3) });
    console.log(JSON.stringify(toGeminiSchema(schema)));
    const out = await generateStructured({
      task: "live.check",
      schema,
      system: "Answer in Hindi.",
      input: "Mustard sown on 20 Oct in Jaipur; expected profit ₹38,000/acre. Headline and 2 bullets.",
      thinking: "low",
    });
    console.log(out);
    expect(out.bullets.length).toBeGreaterThan(0);
  });
});
