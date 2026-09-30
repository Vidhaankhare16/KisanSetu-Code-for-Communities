import { ReverseGeocodeQuerySchema } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { reverseGeocode } from "@/server/providers/geocoding";

export const GET = apiHandler({ query: ReverseGeocodeQuerySchema }, async ({ query }) => reverseGeocode(query.lat, query.lon));

export const OPTIONS = corsPreflight;
