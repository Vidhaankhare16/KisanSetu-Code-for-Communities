/**
 * OpenAPI 3.1 document generated from the same Zod schemas the handlers validate with,
 * so the published contract for state systems can never drift from the implementation.
 */
import { z } from "zod";
import {
  ApiErrorSchema,
  ChatRequestSchema,
  ChatResponseSchema,
  DiagnoseRequestSchema,
  DiagnoseResponseSchema,
  EligibilityProfileSchema,
  FieldContextQuerySchema,
  FieldContextResponseSchema,
  PlaceSearchQuerySchema,
  PlaceSearchResponseSchema,
  RecommendRequestSchema,
  RecommendResponseSchema,
  ReverseGeocodeQuerySchema,
  SimulateRequestSchema,
  SimulateResponseSchema,
  SoilCardRequestSchema,
  SoilCardResponseSchema,
  SpeakRequestSchema,
} from "@/contracts/api";
import { ModelCardSchema } from "@/contracts/cropModel";
import { PlaceSchema } from "@/contracts/farm";

interface Operation {
  method: "get" | "post";
  path: string;
  tag: string;
  summary: string;
  description?: string;
  query?: z.ZodObject;
  body?: z.ZodType;
  response?: z.ZodType;
  responseType?: string;
}

export const OPERATIONS: Operation[] = [
  {
    method: "get",
    path: "/api/v1/places",
    tag: "Places",
    summary: "Search villages, towns and districts in India",
    query: PlaceSearchQuerySchema,
    response: PlaceSearchResponseSchema,
  },
  {
    method: "get",
    path: "/api/v1/places/reverse",
    tag: "Places",
    summary: "Name the place at a GPS coordinate",
    query: ReverseGeocodeQuerySchema,
    response: PlaceSchema,
  },
  {
    method: "get",
    path: "/api/v1/context",
    tag: "Field intelligence",
    summary: "Weather, soil and satellite context for a field",
    description: "Combines the 16-day forecast, live soil moisture, SoilGrids soil properties and MODIS NDVI.",
    query: FieldContextQuerySchema,
    response: FieldContextResponseSchema,
  },
  {
    method: "post",
    path: "/api/v1/simulate",
    tag: "Crop model",
    summary: "Simulate one crop's season day by day until harvest",
    description: "Runs the FAO-56 crop model over a 10-year weather ensemble (forecast + NASA POWER history).",
    body: SimulateRequestSchema,
    response: SimulateResponseSchema,
  },
  {
    method: "post",
    path: "/api/v1/recommend",
    tag: "Crop model",
    summary: "Rank sowable crops for a field and explain the choice",
    description:
      "Simulates every crop whose sowing window fits the date and ranks them by the farmer's priority; Gemini adds an explanation and a regenerative plan.",
    body: RecommendRequestSchema,
    response: RecommendResponseSchema,
  },
  {
    method: "get",
    path: "/api/v1/recommendations/{id}",
    tag: "Crop model",
    summary: "Fetch a saved recommendation (shareable link)",
    response: RecommendResponseSchema,
  },
  {
    method: "post",
    path: "/api/v1/diagnose",
    tag: "Crop health",
    summary: "Diagnose a crop problem from a photo",
    body: DiagnoseRequestSchema,
    response: DiagnoseResponseSchema,
  },
  {
    method: "post",
    path: "/api/v1/soil-card",
    tag: "Crop health",
    summary: "Read a Soil Health Card photo into structured values",
    body: SoilCardRequestSchema,
    response: SoilCardResponseSchema,
  },
  {
    method: "post",
    path: "/api/v1/chat",
    tag: "Assistant",
    summary: "Ask Kisan Mitra by text or voice",
    body: ChatRequestSchema,
    response: ChatResponseSchema,
  },
  { method: "post", path: "/api/v1/speak", tag: "Assistant", summary: "Speak a text aloud (WAV)", body: SpeakRequestSchema, responseType: "audio/wav" },
  {
    method: "get",
    path: "/api/v1/models",
    tag: "Model registry",
    summary: "List published crop models (national + state calibrations)",
    response: z.object({ models: z.array(ModelCardSchema) }),
  },
  { method: "get", path: "/api/v1/models/{id}", tag: "Model registry", summary: "Get one crop model card", response: ModelCardSchema },
  { method: "get", path: "/api/v1/schemes", tag: "Schemes", summary: "List central farmer schemes" },
  {
    method: "post",
    path: "/api/v1/schemes/eligibility",
    tag: "Schemes",
    summary: "Check scheme eligibility with explained rules",
    body: EligibilityProfileSchema,
  },
  { method: "get", path: "/api/v1/prices", tag: "Markets", summary: "MSP and indicative prices used by the model" },
  { method: "get", path: "/api/v1/network/summary", tag: "Network", summary: "Anonymised network activity and disease surveillance" },
  { method: "get", path: "/api/health", tag: "Operations", summary: "Liveness and configuration check" },
];

const jsonSchema = (schema: z.ZodType) => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  return rest;
};

export function buildOpenApiDocument(serverUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of OPERATIONS) {
    const pathParams = [...op.path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
    const queryParams = op.query
      ? Object.entries(op.query.shape).map(([name, schema]) => ({
          name,
          in: "query",
          required: !(schema as z.ZodType).safeParse(undefined).success,
          schema: jsonSchema(schema as z.ZodType),
        }))
      : [];
    paths[op.path] ??= {};
    paths[op.path]![op.method] = {
      tags: [op.tag],
      summary: op.summary,
      ...(op.description ? { description: op.description } : {}),
      operationId: `${op.method}${op.path
        .replace(/[{}]/g, "")
        .replace(/\/(\w)/g, (_, c: string) => c.toUpperCase())
        .replace(/[^A-Za-z0-9]/g, "")}`,
      parameters: [...pathParams, ...queryParams],
      ...(op.body ? { requestBody: { required: true, content: { "application/json": { schema: jsonSchema(op.body) } } } } : {}),
      responses: {
        "200": {
          description: "OK",
          content: op.responseType
            ? { [op.responseType]: { schema: { type: "string", format: "binary" } } }
            : { "application/json": { schema: op.response ? jsonSchema(op.response) : { type: "object" } } },
        },
        "400": { description: "Invalid request", content: { "application/json": { schema: jsonSchema(ApiErrorSchema) } } },
        "429": { description: "Rate limited" },
        "502": { description: "An upstream open-data source is unavailable" },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "KisanSetu Open Agri-Intelligence API",
      version: "1.0.0",
      description:
        "Open API of the KisanSetu digital public good: crop simulation, crop recommendation, crop-health diagnosis and a shared crop-model registry that Indian states can call, calibrate and extend.",
      license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    },
    servers: [{ url: serverUrl }],
    paths,
  };
}
