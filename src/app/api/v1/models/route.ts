import { modelCards } from "@/domain/crops/registry";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

export const GET = apiHandler({}, async () => ({ models: modelCards() }));

export const OPTIONS = corsPreflight;
