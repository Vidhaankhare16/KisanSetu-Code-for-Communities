"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { cn } from "@/lib/cn";
import { BrandMark } from "./BrandMark";
import { LanguageSelect } from "./LanguageSelect";

const LINKS: { href: string; key: MessageKey }[] = [
  { href: "/plan", key: "nav.plan" },
  { href: "/simulate", key: "nav.simulate" },
  { href: "/doctor", key: "nav.doctor" },
  { href: "/mitra", key: "nav.mitra" },
  { href: "/schemes", key: "nav.schemes" },
  { href: "/network", key: "nav.network" },
  { href: "/developers", key: "nav.developers" },
];

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-mist/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-ink" onClick={() => setOpen(false)}>
          <BrandMark className="size-8 text-ink" />
          <span className="display text-xl font-semibold">{t("brand.name")}</span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={cn(
                "rounded-control px-3 py-2 text-[15px] text-ink-soft hover:text-ink",
                pathname.startsWith(l.href) && "bg-surface text-ink shadow-[inset_0_-2px_0_var(--color-leaf)]",
              )}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelect />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-control text-ink hover:bg-ink/5 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
            <span className="sr-only">{t("nav.menu")}</span>
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-surface px-4 py-2 lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className="block rounded-control px-3 py-3 text-base text-ink hover:bg-mist aria-[current=page]:font-semibold aria-[current=page]:text-leaf-deep"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
