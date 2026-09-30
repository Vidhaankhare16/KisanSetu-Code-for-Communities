import { EligibilityProfileSchema } from "@/contracts/api";
import { evaluateSchemes } from "@/domain/schemes/catalog";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

export const POST = apiHandler({ body: EligibilityProfileSchema }, async ({ body }) => ({
  matches: evaluateSchemes(body),
}));

export const OPTIONS = corsPreflight;
