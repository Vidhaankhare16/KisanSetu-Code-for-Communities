import Link from "next/link";
import type { Translate } from "@/i18n/translate";
import { BrandMark } from "./BrandMark";

export function SiteFooter({ t }: { t: Translate }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_2fr]">
        <div className="flex items-start gap-3">
          <BrandMark className="size-9 shrink-0 text-ink" />
          <div>
            <p className="display text-lg font-semibold">{t("brand.name")}</p>
            <p className="max-w-xs text-sm text-ink-soft">{t("brand.tagline")}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-ink-soft">
          <p>{t("footer.data")}</p>
          <p>{t("footer.ai")}</p>
          <p>
            {t("footer.license")}{" "}
            <Link href="/developers" className="text-water underline-offset-4 hover:underline">
              {t("nav.developers")}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
