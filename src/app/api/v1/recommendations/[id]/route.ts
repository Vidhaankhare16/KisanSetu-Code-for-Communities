import { apiHandler } from "@/server/http/apiHandler";
import { AppError } from "@/server/http/errors";
import { networkRepository } from "@/server/repositories";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/recommendations/[id]">) {
  const { id } = await ctx.params;
  return apiHandler({}, async () => {
    const rec = await (await networkRepository()).getRecommendation(id);
    if (!rec) throw new AppError("not_found", "This recommendation has expired or does not exist.");
    return rec;
  })(request);
}
