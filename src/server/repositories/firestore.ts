/**
 * Firestore adapter (Native mode). Collections:
 *   advisories/{id}, diagnoses/{id}, recommendations/{id}
 * Uses Application Default Credentials — on Cloud Run, the service account.
 */
import "server-only";
import { Firestore } from "@google-cloud/firestore";
import type { RecommendResponse } from "@/contracts/api";
import { summarise } from "./memory";
import type { AdvisoryRecord, DiagnosisRecord, NetworkRepository, NetworkStats } from "./types";

/** Dashboard statistics are computed over the most recent records. */
const STATS_WINDOW = 2000;

export class FirestoreNetworkRepository implements NetworkRepository {
  readonly backend = "firestore" as const;
  private readonly db: Firestore;

  constructor(projectId?: string, databaseId = "(default)") {
    this.db = new Firestore({ projectId, databaseId, ignoreUndefinedProperties: true });
  }

  async saveAdvisory(record: AdvisoryRecord): Promise<void> {
    await this.db.collection("advisories").doc(record.id).set(record);
  }

  async saveDiagnosis(record: DiagnosisRecord): Promise<void> {
    await this.db.collection("diagnoses").doc(record.id).set(record);
  }

  async saveRecommendation(rec: RecommendResponse): Promise<void> {
    // Stored as JSON text: day-by-day arrays are large and never queried field by field.
    await this.db
      .collection("recommendations")
      .doc(rec.id)
      .set({ createdAt: new Date().toISOString(), payload: JSON.stringify(rec) });
  }

  async getRecommendation(id: string): Promise<RecommendResponse | null> {
    const snap = await this.db.collection("recommendations").doc(id).get();
    const payload = snap.get("payload");
    return typeof payload === "string" ? (JSON.parse(payload) as RecommendResponse) : null;
  }

  async recentDiagnoses(limit: number): Promise<DiagnosisRecord[]> {
    const snap = await this.db.collection("diagnoses").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data() as DiagnosisRecord);
  }

  async stats(): Promise<NetworkStats> {
    const [adv, diag] = await Promise.all([
      this.db.collection("advisories").orderBy("createdAt", "desc").limit(STATS_WINDOW).get(),
      this.db.collection("diagnoses").orderBy("createdAt", "desc").limit(STATS_WINDOW).get(),
    ]);
    return summarise(
      adv.docs.map((d) => d.data() as AdvisoryRecord),
      diag.docs.map((d) => d.data() as DiagnosisRecord),
    );
  }
}
