import { DiagnoseRequestSchema } from "@/contracts/api";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";
import { diagnose } from "@/server/services/diagnosis";

export const POST = apiHandler({ body: DiagnoseRequestSchema, cost: 5 }, async ({ body }) => diagnose(body));

export const OPTIONS = corsPreflight;
