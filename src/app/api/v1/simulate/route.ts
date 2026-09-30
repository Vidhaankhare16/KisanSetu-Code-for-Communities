import { SimulateRequestSchema } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { simulateCrop } from "@/server/services/simulation";

export const POST = apiHandler({ body: SimulateRequestSchema, cost: 3 }, async ({ body }) => simulateCrop(body));

export const OPTIONS = corsPreflight;
