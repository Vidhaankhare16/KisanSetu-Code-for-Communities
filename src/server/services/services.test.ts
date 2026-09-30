import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetch, whenHost } from "../../../tests/helpers/fetchMock";
import { modisSubset, nasaPowerDaily, openMeteoForecast, soilGridsResponse } from "../../../tests/helpers/fixtures";
import { RecommendRequestSchema, RecommendResponseSchema, SimulateRequestSchema, SimulateResponseSchema } from "@/contracts/api";
import { addDays, toIsoDate } from "@/domain/time";
import { resetEnvForTests } from "@/server/config/env";
import { getFieldContext } from "./fieldContext";
import { recommendCrops } from "./recommendation";
import { resolveCropId, simulateCrop } from "./simulation";

const today = toIsoDate(new Date());

/** Every open-data source answers from fixtures; SoilGrids can be switched off per test. */
function mockOpenData({ soil = true } = {}) {
  return mockFetch(
    whenHost("api.open-meteo.com", openMeteoForecast(today)),
    whenHost("power.larc.nasa.gov", nasaPowerDaily("2012-01-01", addDays(today, -5))),
    whenHost("modis.ornl.gov", modisSubset([[addDays(today, -16), 3500]])),
    soil ? whenHost("rest.isric.org", soilGridsResponse({ sand: 300, clay: 300 })) : () => undefined,
  );
}

beforeEach(() => {
  // No Gemini in unit tests: services must still answer from the crop model alone.
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("GOOGLE_GENAI_USE_VERTEXAI", "");
  resetEnvForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("field context", () => {
  it("combines forecast, soil map and satellite data with their sources", async () => {
    mockOpenData();
    const ctx = await getFieldContext({ name: "Test", state: "Uttar Pradesh", lat: 25.11, lon: 81.11 });
    expect(ctx.soil).toMatchObject({ source: "soilgrids", texture: "clay_loam" });
    expect(ctx.vegetation?.latest?.ndvi).toBe(0.35);
    expect(ctx.dataSources.map((d) => d.kind)).toEqual(expect.arrayContaining(["forecast", "climatology", "satellite", "soil", "model"]));
    expect(ctx.warnings).toEqual([]);
  });

  it("falls back to the state's dominant soil when the soil map is unavailable", async () => {
    mockOpenData({ soil: false });
    const ctx = await getFieldContext({ name: "Test", state: "Maharashtra", lat: 19.22, lon: 76.22 });
    expect(ctx.soil).toMatchObject({ source: "regional_default", texture: "clay" });
    expect(ctx.warnings.length).toBeGreaterThan(0);
  });
});

describe("crop recommendation service", () => {
  it("ranks crops from the model alone when AI is not configured", async () => {
    mockOpenData();
    const req = RecommendRequestSchema.parse({
      place: { name: "Test", state: "Uttar Pradesh", lat: 25.33, lon: 81.33 },
      sowingDate: today,
      water: "limited",
    });
    const res = await recommendCrops(req);
    expect(() => RecommendResponseSchema.parse(res)).not.toThrow();
    expect(res.advisory).toBeNull();
    expect(res.ranking.length).toBeGreaterThan(0);
    expect(res.topSimulations.length).toBe(Math.min(3, res.ranking.length));
    expect(res.topSimulations[0]!.days[0]!.weatherSource).toBe("forecast");
  });

  it("rejects sowing dates far in the past", async () => {
    mockOpenData();
    const req = RecommendRequestSchema.parse({
      place: { name: "Test", lat: 25.44, lon: 81.44 },
      sowingDate: addDays(today, -200),
    });
    await expect(recommendCrops(req)).rejects.toThrow(/Sowing date/);
  });
});

describe("simulation service", () => {
  it("returns a contract-valid season with analysis", async () => {
    mockOpenData();
    const res = await simulateCrop(
      SimulateRequestSchema.parse({ place: { name: "Test", lat: 25.55, lon: 81.55 }, sowingDate: today, cropId: "chickpea", narrate: false }),
    );
    expect(() => SimulateResponseSchema.parse(res)).not.toThrow();
    expect(res.analysis.members.length).toBeGreaterThanOrEqual(10);
  });

  it("returns not_found for unknown crops", async () => {
    await expect(
      simulateCrop(SimulateRequestSchema.parse({ place: { name: "T", lat: 25, lon: 81 }, sowingDate: today, cropId: "dragonfruit" })),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("resolves previous crops by id, English or local name", () => {
    expect(resolveCropId("wheat")).toBe("wheat");
    expect(resolveCropId("Paddy")).toBeUndefined();
    expect(resolveCropId("rice")).toBe("rice");
    expect(resolveCropId("sarson")).toBe("mustard");
    expect(resolveCropId(undefined)).toBeUndefined();
  });
});
