import { PlaceSearchQuerySchema } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { searchPlaces } from "@/server/providers/geocoding";

export const GET = apiHandler({ query: PlaceSearchQuerySchema }, async ({ query }) => ({
  places: await searchPlaces(query.q),
}));

export const OPTIONS = corsPreflight;
