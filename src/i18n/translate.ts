/** Framework-free translation core: typed keys, `{var}` interpolation, English fallback. */
import { en, type Messages } from "./messages/en";

type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

/** Deep-merges a (possibly partial) translation over English so gaps never show raw keys. */
export function withFallback(partial: unknown): Messages {
  return merge(en, partial) as Messages;
}

function merge(base: unknown, over: unknown): unknown {
  if (typeof base === "string") return typeof over === "string" && over.trim() ? over : base;
  const out: Record<string, unknown> = {};
  const o = (over && typeof over === "object" ? over : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(base as Record<string, unknown>)) out[k] = merge(v, o[k]);
  return out;
}

export function createTranslator(messages: Messages): Translate {
  return (key, vars) => {
    const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
    const text = typeof value === "string" ? value : key;
    return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
  };
}
