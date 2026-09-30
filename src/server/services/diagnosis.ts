/** Crop-photo diagnosis and Soil Health Card reading, with weather context and surveillance logging. */
import "server-only";
import { randomUUID } from "node:crypto";
import type { DiagnoseResponse } from "@/contracts/api";
import type { SoilCardExtraction } from "@/contracts/ai";
import type { Lang, Place } from "@/contracts/farm";
import { diagnoseCropPhoto, readSoilHealthCard } from "@/server/ai/vision";
import { logger } from "@/server/logger";
import { getForecast } from "@/server/providers/openMeteo";
import { recordInBackground } from "@/server/repositories";
import { anonymiseCoord } from "@/server/repositories/types";

export interface DiagnoseCommand {
  imageBase64: string;
  mimeType: string;
  note?: string;
  cropHint?: string;
  place?: Place;
  lang: Lang;
}

/** A one-line weather summary that helps separate look-alike diseases (e.g. blight vs. scorch). */
export async function weatherSummary(place: Place | undefined): Promise<string | null> {
  if (!place) return null;
  try {
    const fc = await getForecast(place.lat, place.lon);
    const next = fc.days.slice(0, 5);
    const rain = Math.round(next.reduce((a, d) => a + d.rain, 0));
    const humid = next.filter((d) => (d.rhMean ?? 0) >= 80).length;
    const now = fc.current;
    return [
      now?.temperatureC != null ? `now ${Math.round(now.temperatureC)}°C` : null,
      now?.humidityPct != null ? `${Math.round(now.humidityPct)}% humidity` : null,
      `next 5 days: ${rain} mm rain, ${humid} humid days, ${Math.round(Math.min(...next.map((d) => d.tMin)))}-${Math.round(Math.max(...next.map((d) => d.tMax)))}°C`,
    ]
      .filter(Boolean)
      .join(", ");
  } catch (err) {
    logger.warn("weather summary unavailable", { error: String(err) });
    return null;
  }
}

export async function diagnose(cmd: DiagnoseCommand): Promise<DiagnoseResponse> {
  const weatherContext = await weatherSummary(cmd.place);
  const diagnosis = await diagnoseCropPhoto({ ...cmd, weatherContext });
  const id = `diag_${randomUUID()}`;

  // Only confident, real findings feed the network's disease-surveillance view.
  if (!diagnosis.healthy && diagnosis.issueType !== "unclear" && diagnosis.confidence >= 0.5) {
    recordInBackground((repo) =>
      repo.saveDiagnosis({
        id,
        createdAt: new Date().toISOString(),
        state: cmd.place?.state,
        district: cmd.place?.district,
        lat: cmd.place ? anonymiseCoord(cmd.place.lat) : undefined,
        lon: cmd.place ? anonymiseCoord(cmd.place.lon) : undefined,
        crop: diagnosis.crop,
        issue: diagnosis.issue,
        issueType: diagnosis.issueType,
        severity: diagnosis.severity,
        confidence: diagnosis.confidence,
      }),
    );
  }
  return { id, diagnosis, weatherContext };
}

export async function extractSoilCard(imageBase64: string, mimeType: string): Promise<SoilCardExtraction> {
  return readSoilHealthCard(imageBase64, mimeType);
}
