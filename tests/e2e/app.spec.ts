import { expect, test } from "@playwright/test";

test("home page shows a simulated season and the field search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Where is your field?" })).toBeVisible();
  await expect(page.getByRole("img", { name: /in full bloom/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Mustard sown on/ })).toBeVisible();
});

test("planner ranks crops for a searched village and opens its season", async ({ page }) => {
  await page.goto("/plan");
  await page.getByRole("combobox", { name: "Where is your field?" }).fill("Malihabad");
  await page
    .getByRole("option", { name: /Malīhābād|Malihabad/ })
    .first()
    .click();
  await expect(page.getByText("Your field right now")).toBeVisible();

  await page.getByRole("button", { name: "Compare crops" }).click();
  await expect(page.getByRole("heading", { name: /Best crops for/ })).toBeVisible();

  const rows = page.locator("#results ol").first().getByRole("button");
  expect(await rows.count()).toBeGreaterThan(3);
  await expect(page.getByRole("img", { name: "Profit against water" })).toBeVisible();

  // Scrubbing the season moves the field to that day.
  await page.getByRole("slider", { name: "Season" }).fill("40");
  await expect(page.getByText(/Day 41 \//).first()).toBeVisible();
});

test("simulator plays a sample season without calling the API", async ({ page }) => {
  await page.goto("/simulate");
  await page.getByRole("button", { name: /Wheat, Ludhiana/ }).click();
  await page.getByRole("button", { name: "Play season" }).click();
  await expect(page.getByText(/Day ([2-9]|\d{2,}) \//).first()).toBeVisible();
  await page.getByRole("button", { name: "Look closer" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("scheme checker explains eligibility", async ({ page }) => {
  await page.goto("/schemes");
  await page.getByRole("button", { name: "Check eligibility" }).click();
  await expect(page.getByText("PM-KISAN Samman Nidhi")).toBeVisible();
  await expect(page.getByText("Landholding farmer family.")).toBeVisible();
});

test("state dashboard renders the district outlook and model registry", async ({ page }) => {
  await page.goto("/network");
  await expect(page.getByRole("heading", { name: "Rabi outlook by district" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Ludhiana/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shared crop models" })).toBeVisible();
});

test("every page renders in Hindi", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "ks_lang", value: "hi", url: baseURL! }]);
  for (const path of ["/", "/plan", "/simulate", "/doctor", "/mitra", "/schemes", "/network", "/developers"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  }
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
