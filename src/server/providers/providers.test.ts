import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch, whenHost } from "../../../tests/helpers/fetchMock";
import { modisSubset, nasaPowerDaily, openMeteoForecast, soilGridsResponse } from "../../../tests/helpers/fixtures";
import { z } from "zod";
import { fetchJson } from "@/server/http/fetchJson";
import { UpstreamError } from "@/server/http/errors";
import { getForecast } from "./openMeteo";
import { getDailyHistory } from "./nasaPower";
import { getSoilProfile } from "./soilGrids";
import { coverLabel, getVegetation, modisDate } from "./modis";
import { searchPlaces } from "./geocoding";

afterEach(() => vi.unstubAllGlobals());

describe("fetchJson", () => {
  const schema = z.object({ ok: z.boolean() });

  it("retries transient failures and then succeeds", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => (++calls < 3 ? new Response("busy", { status: 503 }) : Response.json({ ok: true })));
    await expect(fetchJson("https://x.test/a", { source: "t", schema, retries: 2 })).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it("does not retry client errors", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return new Response("nope", { status: 404 });
    });
    await expect(fetchJson("https://x.test/b", { source: "t", schema })).rejects.toBeInstanceOf(UpstreamError);
    expect(calls).toBe(1);
  });

  it("rejects responses that do not match the schema", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ ok: "yes" }));
    await expect(fetchJson("https://x.test/c", { source: "t", schema })).rejects.toThrow(/unexpected response shape/);
  });
});

describe("Open-Meteo forecast", () => {
  it("parses daily forecast, current weather and root-zone soil moisture", async () => {
    mockFetch(whenHost("api.open-meteo.com", openMeteoForecast("2026-10-01")));
    const fc = await getForecast(26.1, 80.1);
    expect(fc.days).toHaveLength(16);
    expect(fc.days[3]).toMatchObject({ rain: 12, rainProbabilityPct: 80, source: "forecast" });
    expect(fc.current?.temperatureC).toBe(29.4);
    // Thickness-weighted mean of 0.30 (18 cm) and 0.26 (54 cm).
    expect(fc.rootZoneSoilMoisture).toBeCloseTo(0.27, 3);
  });
});

describe("NASA POWER history", () => {
  it("computes Penman-Monteith ET0 and skips missing values", async () => {
    mockFetch(whenHost("power.larc.nasa.gov", nasaPowerDaily("2024-01-01", "2024-01-31", { missingEvery: 10 })));
    const h = await getDailyHistory(26.2, 80.2, 2024, "2024-01-31");
    expect(h.elevationM).toBe(126);
    expect(h.days.size).toBe(31 - 4); // days 0, 10, 20, 30 carry the -999 fill value
    const day = h.days.get("2024-01-02")!;
    expect(day.et0).toBeGreaterThan(1);
    expect(day.et0).toBeLessThan(5);
    expect(day.rootWetness).toBe(0.45);
  });
});

describe("SoilGrids", () => {
  it("converts mapped units and classifies texture", async () => {
    mockFetch(whenHost("rest.isric.org", soilGridsResponse({ sand: 400, clay: 200, phh2o: 78, soc: 50 })));
    const soil = await getSoilProfile(26.3, 80.3);
    expect(soil).toMatchObject({ sandPct: 40, clayPct: 20, texture: "loam", pH: 7.8, organicCarbonPct: 0.5 });
  });

  it("tries nearby cells when the pixel is masked, then gives up gracefully", async () => {
    const fetch = mockFetch(whenHost("rest.isric.org", soilGridsResponse({ sand: null, clay: null })));
    await expect(getSoilProfile(26.4, 80.4)).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("MODIS NDVI", () => {
  it("formats MODIS dates and labels cover", () => {
    expect(modisDate("2026-02-01")).toBe("A2026032");
    expect(coverLabel(0.1)).toBe("bare");
    expect(coverLabel(0.7)).toBe("dense");
  });

  it("scales values, drops fill values and finds the same period last year", async () => {
    mockFetch(
      whenHost(
        "modis.ornl.gov",
        modisSubset([
          ["2025-09-14", 6200],
          ["2025-10-01", -3000],
          ["2026-09-14", 2100],
        ]),
      ),
    );
    const veg = await getVegetation(26.5, 80.5, "2026-09-30");
    expect(veg.latest).toEqual({ date: "2026-09-14", ndvi: 0.21 });
    expect(veg.yearAgo?.ndvi).toBe(0.62);
    expect(veg.series.every((p) => p.ndvi > 0)).toBe(true);
    expect(veg.cover).toBe("sparse");
  });
});

describe("place search", () => {
  it("keeps Indian results and maps admin levels to district and state", async () => {
    mockFetch(
      whenHost("geocoding-api.open-meteo.com", {
        results: [
          { name: "Malīhābād", latitude: 26.92223, longitude: 80.71078, country_code: "IN", admin1: "Uttar Pradesh", admin2: "Lucknow" },
          { name: "Elsewhere", latitude: 1, longitude: 1, country_code: "NP" },
        ],
      }),
    );
    const places = await searchPlaces("malihabad test");
    expect(places).toEqual([{ name: "Malīhābād", district: "Lucknow", state: "Uttar Pradesh", lat: 26.9222, lon: 80.7108 }]);
  });
});
