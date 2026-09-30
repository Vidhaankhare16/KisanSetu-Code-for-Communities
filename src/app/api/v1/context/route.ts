import { FieldContextQuerySchema, type FieldContextResponse } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { getFieldContext } from "@/server/services/fieldContext";

export const GET = apiHandler({ query: FieldContextQuerySchema, cost: 3 }, async ({ query }) => {
  const ctx = await getFieldContext(query);
  const response: FieldContextResponse = {
    place: ctx.place,
    today: ctx.today,
    forecast: ctx.forecast
      ? {
          days: ctx.forecast.days.map(({ source: _source, ...d }) => d),
          current: ctx.forecast.current,
          rootZoneSoilMoisture: ctx.forecast.rootZoneSoilMoisture,
        }
      : null,
    soil: { texture: ctx.soil.texture, source: ctx.soil.source, note: ctx.soil.note, profile: ctx.soil.profile },
    vegetation: ctx.vegetation,
    warnings: ctx.warnings,
  };
  return response;
});

export const OPTIONS = corsPreflight;
