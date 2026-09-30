import { apiHandler } from "@/server/http/apiHandler";
import { buildOpenApiDocument } from "@/server/http/openapi";

export const GET = apiHandler({}, async ({ request }) => buildOpenApiDocument(new URL(request.url).origin));
