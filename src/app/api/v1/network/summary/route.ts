import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { getNetworkSummary } from "@/server/services/network";

export const GET = apiHandler({}, async () => getNetworkSummary());

export const OPTIONS = corsPreflight;
