import { RecommendRequestSchema } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { recommendCrops } from "@/server/services/recommendation";

export const POST = apiHandler({ body: RecommendRequestSchema, cost: 5 }, async ({ body }) => recommendCrops(body));

export const OPTIONS = corsPreflight;
