import { CROPS } from "@/domain/crops/catalog";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

export const GET = apiHandler({}, async () => ({
  prices: CROPS.map((c) => ({
    cropId: c.id,
    crop: c.name,
    perQuintalInr: c.price.perQuintalInr,
    basis: c.price.basis,
    priceVolatility: c.priceVolatility,
  })),
}));

export const OPTIONS = corsPreflight;
