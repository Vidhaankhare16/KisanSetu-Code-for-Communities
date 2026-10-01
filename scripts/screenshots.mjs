/**
 * Captures screenshots of the main pages for design review and the submission deck.
 *   node scripts/screenshots.mjs [baseUrl] [outDir]
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3005";
const out = process.argv[3] ?? "screenshots";
mkdirSync(out, { recursive: true });

const PAGES = ["/", "/plan", "/simulate", "/doctor", "/mitra", "/schemes", "/network", "/developers"];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  for (const lang of ["en", "hi"]) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    await context.addCookies([{ name: "ks_lang", value: lang, url: base }]);
    const page = await context.newPage();
    for (const path of PAGES) {
      if (lang === "hi" && vp.name === "mobile" && path !== "/") continue;
      // "load", not "networkidle": a dev server keeps its hot-reload socket open.
      await page.goto(base + path, { waitUntil: "load" });
      // A sticky header would be painted mid-page in a full-page capture taken after scrolling.
      await page.addStyleTag({ content: "header { position: static !important; }" });
      await page.waitForTimeout(800);
      if (path === "/simulate") {
        const sample = page.locator("button[aria-pressed]").filter({ hasText: /Mustard|सरसों/ });
        if (await sample.count()) await sample.first().click();
        await page.waitForTimeout(500);
      }
      if (path === "/") await page.waitForTimeout(2800); // let the season ribbon finish drawing
      const name = `${vp.name}-${lang}${path === "/" ? "-home" : path.replaceAll("/", "-")}.png`;
      await page.screenshot({ path: `${out}/${name}`, fullPage: true });
      console.log("saved", name);
    }
    await context.close();
  }
}
await browser.close();
