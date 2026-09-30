import { modelCards } from "@/domain/crops/registry";
import { apiHandler } from "@/server/http/apiHandler";
import { AppError } from "@/server/http/errors";

/** Accepts either the full model id (`wheat@2026.10-national`) or just the crop id. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/models/[id]">) {
  const { id } = await ctx.params;
  return apiHandler({}, async () => {
    const card = modelCards().find((m) => m.id === id || m.parameters.id === id);
    if (!card) throw new AppError("not_found", `No model "${id}". See GET /api/v1/models.`);
    return card;
  })(request);
}
