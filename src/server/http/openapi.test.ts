import { describe, expect, it } from "vitest";
import { buildOpenApiDocument, OPERATIONS } from "./openapi";

describe("OpenAPI document", () => {
  const doc = buildOpenApiDocument("https://example.org");

  it("documents every operation with a unique operationId", () => {
    const ops = Object.values(doc.paths).flatMap((p) => Object.values(p) as { operationId: string }[]);
    expect(ops).toHaveLength(OPERATIONS.length);
    expect(new Set(ops.map((o) => o.operationId)).size).toBe(ops.length);
  });

  it("serialises to JSON and exposes request schemas", () => {
    const json = JSON.parse(JSON.stringify(doc));
    expect(json.openapi).toBe("3.1.0");
    const simulate = json.paths["/api/v1/simulate"].post;
    expect(simulate.requestBody.content["application/json"].schema.properties.cropId).toBeDefined();
    const search = json.paths["/api/v1/places"].get;
    expect(search.parameters[0]).toMatchObject({ name: "q", in: "query", required: true });
  });
});
