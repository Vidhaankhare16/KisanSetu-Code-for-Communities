"use client";

import { Languages } from "lucide-react";
import { LANG_NAMES, LANGS, type Lang } from "@/contracts/farm";
import { useI18n } from "@/i18n/client";

export function LanguageSelect({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <label className={className}>
      <span className="sr-only">{t("nav.language")}</span>
      <span className="relative flex items-center">
        <Languages className="pointer-events-none absolute left-2.5 size-4 text-ink-soft" aria-hidden />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="h-9 appearance-none rounded-control border border-line bg-surface pr-3 pl-8 text-sm text-ink hover:border-line-strong"
        >
          {LANGS.map((code) => (
            <option key={code} value={code}>
              {LANG_NAMES[code].native}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
