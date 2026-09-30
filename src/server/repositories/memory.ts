/** In-process repository for local development, tests and single-instance demos. */
import type { RecommendResponse } from "@/contracts/api";
import type { AdvisoryRecord, DiagnosisRecord, NetworkRepository, NetworkStats } from "./types";

const MAX_RECORDS = 5000;
const MAX_RECOMMENDATIONS = 500;

export class MemoryNetworkRepository implements NetworkRepository {
  readonly backend = "memory" as const;
  private readonly advisories: AdvisoryRecord[] = [];
  private readonly diagnoses: DiagnosisRecord[] = [];
  private readonly recommendations = new Map<string, RecommendResponse>();

  async saveAdvisory(record: AdvisoryRecord): Promise<void> {
    pushBounded(this.advisories, record);
  }

  async saveDiagnosis(record: DiagnosisRecord): Promise<void> {
    pushBounded(this.diagnoses, record);
  }

  async saveRecommendation(rec: RecommendResponse): Promise<void> {
    if (this.recommendations.size >= MAX_RECOMMENDATIONS) {
      const oldest = this.recommendations.keys().next().value;
      if (oldest !== undefined) this.recommendations.delete(oldest);
    }
    this.recommendations.set(rec.id, rec);
  }

  async getRecommendation(id: string): Promise<RecommendResponse | null> {
    return this.recommendations.get(id) ?? null;
  }

  async recentDiagnoses(limit: number): Promise<DiagnosisRecord[]> {
    return this.diagnoses.slice(-limit).reverse();
  }

  async stats(): Promise<NetworkStats> {
    return summarise(this.advisories, this.diagnoses);
  }
}

/** Aggregates raw records into dashboard statistics (shared with the Firestore adapter). */
export function summarise(advisories: readonly AdvisoryRecord[], diagnoses: readonly DiagnosisRecord[]): NetworkStats {
  const states = new Map<string, { advisories: number; diagnoses: number }>();
  const bump = (state: string | undefined, key: "advisories" | "diagnoses") => {
    const s = state ?? "Unknown";
    const entry = states.get(s) ?? { advisories: 0, diagnoses: 0 };
    entry[key]++;
    states.set(s, entry);
  };
  advisories.forEach((a) => bump(a.state, "advisories"));
  diagnoses.forEach((d) => bump(d.state, "diagnoses"));

  const crops = new Map<string, number>();
  advisories.forEach((a) => {
    const top = a.cropIds[0];
    if (top) crops.set(top, (crops.get(top) ?? 0) + 1);
  });

  return {
    advisories: advisories.length,
    diagnoses: diagnoses.length,
    byState: [...states.entries()]
      .map(([state, v]) => ({ state, ...v }))
      .sort((a, b) => b.advisories + b.diagnoses - (a.advisories + a.diagnoses)),
    topCrops: [...crops.entries()].map(([cropId, count]) => ({ cropId, count })).sort((a, b) => b.count - a.count),
  };
}

function pushBounded<T>(list: T[], item: T) {
  list.push(item);
  if (list.length > MAX_RECORDS) list.shift();
}
