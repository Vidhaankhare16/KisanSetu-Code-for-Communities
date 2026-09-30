"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/contracts/farm";
import type { Messages } from "./messages/en";
import { createTranslator, type Translate } from "./translate";

interface I18nValue {
  lang: Lang;
  t: Translate;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);
const COOKIE = "ks_lang";

export function I18nProvider({ lang, messages, children }: { lang: Lang; messages: Messages; children: ReactNode }) {
  const router = useRouter();
  const t = useMemo(() => createTranslator(messages), [messages]);
  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router],
  );
  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
