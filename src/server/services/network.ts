/** Data for the state dashboard: the model-based national outlook plus live network activity. */
import "server-only";
import outlookJson from "../../../data/outlook/rabi.json";
import { OutlookSchema, type Outlook } from "@/contracts/network";
import { networkRepository } from "@/server/repositories";
import type { DiagnosisRecord, NetworkStats } from "@/server/repositories/types";

/** Validated once at module load — a malformed data file fails the build, not a user request. */
export const RABI_OUTLOOK: Outlook = OutlookSchema.parse(outlookJson);

export interface NetworkSummary {
  outlook: Outlook;
  stats: NetworkStats;
  recentDiagnoses: DiagnosisRecord[];
  storage: "memory" | "firestore";
}

export async function getNetworkSummary(): Promise<NetworkSummary> {
  const repo = await networkRepository();
  const [stats, recentDiagnoses] = await Promise.all([repo.stats(), repo.recentDiagnoses(12)]);
  return { outlook: RABI_OUTLOOK, stats, recentDiagnoses, storage: repo.backend };
}
