/**
 * Generates UI translations from the English source with Gemini:
 *   npm run i18n:translate            # all languages
 *   npm run i18n:translate -- hi ta   # selected languages
 *
 * Each output is validated: same shape as English, and every {placeholder} preserved.
 * Strings that fail validation are dropped so the app falls back to English for them.
 * Native speakers should review the generated files before a state launch.
 */
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { LANG_NAMES, LANGS, type Lang } from "@/contracts/farm";
import { en } from "@/i18n/messages/en";
import { generateStructured } from "@/server/ai/gemini";

type Tree = { [key: string]: string | Tree };

function schemaFor(node: Tree): z.ZodType {
  return z.object(Object.fromEntries(Object.entries(node).map(([k, v]) => [k, typeof v === "string" ? z.string() : schemaFor(v)])));
}

const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");

/** Keeps only translated strings whose placeholders match the English source. */
function validated(source: Tree, translated: Tree): { tree: Tree; dropped: number } {
  let dropped = 0;
  const walk = (src: Tree, tr: Tree): Tree => {
    const out: Tree = {};
    for (const [k, v] of Object.entries(src)) {
      const t = tr?.[k];
      if (typeof v !== "string") out[k] = walk(v, (t as Tree) ?? {});
      else if (typeof t === "string" && t.trim() && placeholders(t) === placeholders(v)) out[k] = t;
      else dropped++;
    }
    return out;
  };
  return { tree: walk(source, translated), dropped };
}

async function translate(lang: Lang): Promise<void> {
  const { english, native } = LANG_NAMES[lang];
  const source = en as unknown as Tree;
  // Translate one top-level section at a time: smaller outputs are faster and more reliable.
  const out: Tree = {};
  let dropped = 0;
  for (const [section, node] of Object.entries(source)) {
    const part = typeof node === "string" ? { value: node } : node;
    const result = await generateStructured({
      task: `i18n.${lang}.${section}`,
      schema: schemaFor(part) as z.ZodType<Tree>,
      system: `You translate the user interface of KisanSetu, an agriculture app for Indian farmers, into ${english} (${native}).
- Use simple, everyday words a farmer uses; prefer common agricultural terms used in ${english}-speaking villages.
- Keep brand names (KisanSetu, Kisan Mitra, PM-KISAN, Gemini, NASA, MODIS, ISRIC, Open-Meteo) and units (mm, q/acre, °C, ₹, NDVI, pH, EC) unchanged.
- Keep every {placeholder} exactly as written.
- Keep the JSON keys unchanged; translate only the values.`,
      input: JSON.stringify(part),
      thinking: "low",
      temperature: 0.2,
    });
    const v = validated(part, result);
    dropped += v.dropped;
    out[section] = typeof node === "string" ? ((v.tree.value as string) ?? node) : v.tree;
  }
  writeFileSync(`src/i18n/messages/${lang}.json`, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`✓ ${lang} (${english})${dropped ? ` — ${dropped} strings fell back to English` : ""}`);
}

async function main() {
  const requested = process.argv.slice(2) as Lang[];
  const langs = (requested.length ? requested : LANGS).filter((l): l is Lang => l !== "en" && (LANGS as readonly string[]).includes(l));
  for (const lang of langs) {
    try {
      await translate(lang);
    } catch (err) {
      console.error(`✗ ${lang}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main();
