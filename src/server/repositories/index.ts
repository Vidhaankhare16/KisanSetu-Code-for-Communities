/** Chooses the storage backend from configuration (memory by default, Firestore on Cloud Run). */
import "server-only";
import { env } from "@/server/config/env";
import { logger } from "@/server/logger";
import { MemoryNetworkRepository } from "./memory";
import type { NetworkRepository } from "./types";

let repo: NetworkRepository | undefined;

export async function networkRepository(): Promise<NetworkRepository> {
  if (!repo) {
    const e = env();
    if (e.DATA_BACKEND === "firestore") {
      const { FirestoreNetworkRepository } = await import("./firestore");
      repo = new FirestoreNetworkRepository(e.GOOGLE_CLOUD_PROJECT);
    } else {
      repo = new MemoryNetworkRepository();
    }
    logger.info("network repository ready", { backend: repo.backend });
  }
  return repo;
}

/** Fire-and-forget write that never fails the user's request. */
export function recordInBackground(write: (r: NetworkRepository) => Promise<void>): void {
  networkRepository()
    .then(write)
    .catch((err) => logger.warn("network record failed", { error: String(err) }));
}
