import { SoilCardRequestSchema } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { extractSoilCard } from "@/server/services/diagnosis";

export const POST = apiHandler({ body: SoilCardRequestSchema, cost: 5 }, async ({ body }) => extractSoilCard(body.imageBase64, body.mimeType));

export const OPTIONS = corsPreflight;
