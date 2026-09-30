import { expect, test } from "@playwright/test";

test("home page shows a simulated season and the field search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Where is your field?" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Mustard sown on/ })).toBeVisible();
});

test("planner ranks crops for a searched village and opens its season", async ({ page }) => {
  await page.goto("/plan");
  await page.getByRole("combobox", { name: "Where is your field?" }).fill("Malihabad");
  await page.getByRole("option", { name: /Malīhābād|Malihabad/ }).first().click();
  await expect(page.getByText("Your field right now")).toBeVisible();

  await page.getByRole("button", { name: "Compare crops" }).click();
  await expect(page.getByRole("heading", { name: /Best crops for/ })).toBeVisible();

  const rows = page.locator("#results ol").first().getByRole("button");
  expect(await rows.count()).toBeGreaterThan(3);
  await expect(page.getByText("What happens this season")).toBeVisible();

  // Scrubbing the season updates the day readout.
  await page.getByRole("slider").first().fill("40");
  await expect(page.getByText(/Day 41 of/)).toBeVisible();
});

test("simulator plays a sample season without calling the API", async ({ page }) => {
  await page.goto("/simulate");
  await page.getByRole("button", { name: /Wheat, Ludhiana/ }).click();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByText(/Day ([2-9]|\d{2,}) of/)).toBeVisible();
});

test("scheme checker explains eligibility", async ({ page }) => {
  await page.goto("/schemes");
  await page.getByRole("button", { name: "Check eligibility" }).click();
  await expect(page.getByText("PM-KISAN Samman Nidhi")).toBeVisible();
  await expect(page.getByText("Landholding farmer family.")).toBeVisible();
});

test("public API publishes its OpenAPI contract and model registry", async ({ request }) => {
  const spec = await request.get("/api/v1/openapi.json");
  expect(spec.ok()).toBe(true);
  expect((await spec.json()).openapi).toBe("3.1.0");

  const model = await request.get("/api/v1/models/wheat");
  expect((await model.json()).parameters.kc.mid).toBeGreaterThan(1);

  const bad = await request.post("/api/v1/simulate", { data: { cropId: "wheat" } });
  expect(bad.status()).toBe(400);
});
