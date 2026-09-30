import { SCHEMES } from "@/domain/schemes/catalog";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

export const GET = apiHandler({}, async () => ({
  schemes: SCHEMES.map(({ check: _check, ...scheme }) => scheme),
}));

export const OPTIONS = corsPreflight;
