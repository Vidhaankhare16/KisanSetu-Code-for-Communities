import { ChatRequestSchema } from "@/contracts/api";
import { chatWithKisanMitra } from "@/server/ai/kisanMitra";
import { apiHandler, corsPreflight } from "@/server/http/apiHandler";

export const POST = apiHandler({ body: ChatRequestSchema, cost: 5 }, async ({ body }) => chatWithKisanMitra(body));

export const OPTIONS = corsPreflight;
