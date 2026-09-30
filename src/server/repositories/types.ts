/**
 * Storage port for network-level data. Records are anonymised: no names or phone numbers,
 * and coordinates are rounded to ~10 km before they are stored.
 */
import type { RecommendResponse } from "@/contracts/api";

export interface AdvisoryRecord {
  id: string;
  kind: "recommendation" | "simulation";
  createdAt: string;
  state?: string;
  district?: string;
  lat: number;
  lon: number;
  sowingDate: string;
  water: string;
  cropIds: string[];
  lang: string;
}

export interface DiagnosisRecord {
  id: string;
  createdAt: string;
  state?: string;
  district?: string;
  lat?: number;
  lon?: number;
  crop: string;
  issue: string;
  issueType: string;
  severity: string;
  confidence: number;
}

export interface StateActivity {
  state: string;
  advisories: number;
  diagnoses: number;
}

export interface NetworkStats {
  advisories: number;
  diagnoses: number;
  byState: StateActivity[];
  topCrops: { cropId: string; count: number }[];
}

export interface NetworkRepository {
  readonly backend: "memory" | "firestore";
  saveAdvisory(record: AdvisoryRecord): Promise<void>;
  saveDiagnosis(record: DiagnosisRecord): Promise<void>;
  saveRecommendation(rec: RecommendResponse): Promise<void>;
  getRecommendation(id: string): Promise<RecommendResponse | null>;
  recentDiagnoses(limit: number): Promise<DiagnosisRecord[]>;
  stats(): Promise<NetworkStats>;
}

/** Round to 0.1° (~11 km) so individual farms cannot be located. */
export const anonymiseCoord = (v: number) => Math.round(v * 10) / 10;
