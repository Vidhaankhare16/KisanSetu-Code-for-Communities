import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "./en";

type Tree = { [key: string]: string | Tree };

function leaves(node: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(path, v);
    else leaves(v, path).forEach((val, key) => out.set(key, val));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const source = leaves(en as unknown as Tree);
const dir = join(process.cwd(), "src/i18n/messages");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe.each(files)("%s", (file) => {
  const translated = leaves(JSON.parse(readFileSync(join(dir, file), "utf8")) as Tree);

  it("only contains keys that exist in English", () => {
    const unknown = [...translated.keys()].filter((k) => !source.has(k));
    expect(unknown).toEqual([]);
  });

  it("keeps every {placeholder} of the English string", () => {
    const broken = [...translated.entries()].filter(([k, v]) => source.has(k) && placeholders(v).join() !== placeholders(source.get(k)!).join());
    expect(broken).toEqual([]);
  });
});

describe("English source", () => {
  it("has no empty strings", () => {
    expect([...source.entries()].filter(([, v]) => !v.trim())).toEqual([]);
  });
});
