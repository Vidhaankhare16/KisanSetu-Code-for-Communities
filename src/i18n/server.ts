/** Server-side language resolution (cookie → Accept-Language → English) and message loading. */
import "server-only";
import { cookies, headers } from "next/headers";
import { LANGS, type Lang } from "@/contracts/farm";
import { en, type Messages } from "./messages/en";
import { withFallback } from "./translate";

export const LANG_COOKIE = "ks_lang";

const isLang = (v: string | undefined): v is Lang => !!v && (LANGS as readonly string[]).includes(v);

export async function getLang(): Promise<Lang> {
  const fromCookie = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return "en";
}

/** Explicit loaders keep each language in its own chunk and let the bundler verify the files. */
const LOADERS: Record<Exclude<Lang, "en">, () => Promise<{ default: unknown }>> = {
  hi: () => import("./messages/hi.json"),
  bn: () => import("./messages/bn.json"),
  te: () => import("./messages/te.json"),
  mr: () => import("./messages/mr.json"),
  ta: () => import("./messages/ta.json"),
  gu: () => import("./messages/gu.json"),
  kn: () => import("./messages/kn.json"),
  ml: () => import("./messages/ml.json"),
  pa: () => import("./messages/pa.json"),
  or: () => import("./messages/or.json"),
};

export async function getMessages(lang: Lang): Promise<Messages> {
  if (lang === "en") return en;
  return withFallback((await LOADERS[lang]()).default);
}
