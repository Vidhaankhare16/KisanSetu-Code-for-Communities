import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { syntheticScenario } from "../../../tests/helpers/weather";
import { ChatRequestSchema } from "@/contracts/api";
import { runEnsemble } from "@/domain/agro/ensemble";
import { requireCrop } from "@/domain/crops/catalog";
import { resetEnvForTests } from "@/server/config/env";

const generateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  class FakeGenAI {
    models = { generateContent };
  }
  return { ...actual, GoogleGenAI: FakeGenAI };
});

const { generateStructured, isTransientAiError, toGeminiSchema, withRetry } = await import("./gemini");
const { chatWithKisanMitra } = await import("./kisanMitra");
const { narrateSimulation } = await import("./narrator");
const { pcmToWav } = await import("./speech");

const reply = (text: string) => ({ text, candidates: [{ content: { role: "model", parts: [{ text }] } }] });

beforeEach(() => {
  generateContent.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  resetEnvForTests();
});
afterAll(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("structured generation", () => {
  const schema = z.object({ headline: z.string(), score: z.number().min(0).max(10) });
  const request = { task: "test", schema, system: "sys", input: "hello" };

  it("sends a JSON schema without the $schema key", () => {
    expect(toGeminiSchema(schema)).not.toHaveProperty("$schema");
    expect(toGeminiSchema(schema)).toMatchObject({ type: "object", required: ["headline", "score"] });
  });

  it("returns validated output", async () => {
    generateContent.mockResolvedValueOnce(reply('{"headline":"Sow mustard","score":8}'));
    await expect(generateStructured(request)).resolves.toEqual({ headline: "Sow mustard", score: 8 });
    const config = generateContent.mock.calls[0]![0].config;
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseJsonSchema).toBeDefined();
  });

  it("retries once, showing the model its validation errors", async () => {
    generateContent.mockResolvedValueOnce(reply('{"headline":"x","score":42}')).mockResolvedValueOnce(reply('```json\n{"headline":"x","score":4}\n```'));
    await expect(generateStructured(request)).resolves.toEqual({ headline: "x", score: 4 });
    const retryContents = generateContent.mock.calls[1]![0].contents;
    expect(JSON.stringify(retryContents.at(-1))).toContain("did not match the schema");
  });

  it("refuses to pass on output that stays invalid", async () => {
    generateContent.mockResolvedValue(reply("not json"));
    await expect(generateStructured(request)).rejects.toMatchObject({ code: "ai_unavailable" });
  });
});

describe("transient Gemini errors", () => {
  const noWait = { sleep: async () => {} };
  const rateLimited = Object.assign(new Error("Resource exhausted"), { status: 429 });

  it("treats rate limits and outages as transient, but not bad requests", () => {
    expect(isTransientAiError(rateLimited)).toBe(true);
    expect(isTransientAiError(Object.assign(new Error("x"), { status: 503 }))).toBe(true);
    expect(isTransientAiError(new Error('{"status":"RESOURCE_EXHAUSTED"}'))).toBe(true);
    expect(isTransientAiError(Object.assign(new Error("bad"), { status: 400 }))).toBe(false);
  });

  it("retries a rate-limited call until it succeeds", async () => {
    const call = vi.fn().mockRejectedValueOnce(rateLimited).mockRejectedValueOnce(rateLimited).mockResolvedValueOnce("ok");
    await expect(withRetry("test", call, noWait)).resolves.toBe("ok");
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("gives up after the last attempt and does not retry permanent errors", async () => {
    const always = vi.fn().mockRejectedValue(rateLimited);
    await expect(withRetry("test", always, { ...noWait, attempts: 3 })).rejects.toBe(rateLimited);
    expect(always).toHaveBeenCalledTimes(3);

    const badRequest = Object.assign(new Error("bad"), { status: 400 });
    const once = vi.fn().mockRejectedValue(badRequest);
    await expect(withRetry("test", once, noWait)).rejects.toBe(badRequest);
    expect(once).toHaveBeenCalledTimes(1);
  });

  it("structured generation survives a rate limit", async () => {
    generateContent.mockRejectedValueOnce(rateLimited).mockResolvedValueOnce(reply('{"ok":true}'));
    const result = await generateStructured({ task: "t", schema: z.object({ ok: z.boolean() }), system: "s", input: "i" });
    expect(result).toEqual({ ok: true });
  });
});

describe("Kisan Mitra agent", () => {
  it("calls platform tools and answers with their results", async () => {
    generateContent
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "get_msp", args: { crop_id: "wheat" } }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { id: "c1", name: "get_msp", args: { crop_id: "wheat" } } }] } }],
      })
      .mockResolvedValueOnce(reply("Wheat MSP is ₹2,610 per quintal."));

    const res = await chatWithKisanMitra(ChatRequestSchema.parse({ messages: [{ role: "user", text: "Wheat MSP?" }], lang: "hi" }));

    expect(res.reply).toBe("Wheat MSP is ₹2,610 per quintal.");
    expect(res.toolCalls).toEqual([{ name: "get_msp", summary: "Looked up MSP" }]);
    const toolTurn = generateContent.mock.calls[1]![0].contents.at(-1);
    expect(JSON.stringify(toolTurn)).toContain("2610");
    expect(generateContent.mock.calls[0]![0].config.systemInstruction).toContain("Hindi");
  });

  it("reports invalid tool arguments back to the model instead of crashing", async () => {
    generateContent
      .mockResolvedValueOnce({ functionCalls: [{ id: "c1", name: "simulate_crop", args: { crop_id: "dragonfruit" } }], candidates: [] })
      .mockResolvedValueOnce(reply("Which crop do you mean?"));
    const res = await chatWithKisanMitra(ChatRequestSchema.parse({ messages: [{ role: "user", text: "simulate" }] }));
    expect(res.reply).toBe("Which crop do you mean?");
    expect(JSON.stringify(generateContent.mock.calls[1]![0].contents.at(-1))).toContain("Invalid arguments");
  });
});

describe("narrator", () => {
  const { simulation, analysis } = runEnsemble({
    crop: requireCrop("mustard"),
    place: { name: "Jaipur", lat: 26.9, lon: 75.8 },
    sowingDate: "2026-10-20",
    field: { texture: "loam", water: "limited", irrigationMethod: "flood", initialMoistureFraction: 0.6 },
    scenarios: [syntheticScenario({ start: "2026-10-20", tMax: 24, tMin: 9, et0: 3 })],
    dataSources: [],
  });
  const localized = (events: number) =>
    JSON.stringify({
      headline: "सरसों अच्छी रहेगी",
      bullets: ["एक", "दो"],
      stages: simulation.stages.map((s) => ({ label: `हि ${s.key}`, description: "विवरण" })),
      events: Array.from({ length: events }, (_, i) => ({ title: `घटना ${i}`, detail: "विवरण", action: "कदम" })),
    });

  it("translates stages and events when the structure matches", async () => {
    generateContent.mockResolvedValueOnce(reply(localized(simulation.events.length)));
    const out = await narrateSimulation(simulation, analysis, "hi");
    expect(out.narrative?.headline).toBe("सरसों अच्छी रहेगी");
    expect(out.events[0]!.title).toBe("घटना 0");
    expect(out.events.map((e) => e.day)).toEqual(simulation.events.map((e) => e.day));
  });

  it("keeps the original timeline when the translation drops items", async () => {
    generateContent.mockResolvedValueOnce(reply(localized(1)));
    const out = await narrateSimulation(simulation, analysis, "hi");
    expect(out.narrative?.headline).toBe("सरसों अच्छी रहेगी");
    expect(out.events[0]!.title).toBe(simulation.events[0]!.title);
  });
});

describe("speech", () => {
  it("wraps 16-bit PCM in a valid WAV header", () => {
    const wav = pcmToWav(Buffer.alloc(480), 24_000);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt32LE(40)).toBe(480);
    expect(wav.length).toBe(524);
  });
});
