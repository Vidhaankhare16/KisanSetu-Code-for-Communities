import type { Metadata } from "next";
import Link from "next/link";
import { FileJson } from "lucide-react";
import { getLang, getMessages } from "@/i18n/server";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { OPERATIONS } from "@/server/http/openapi";

export const metadata: Metadata = {
  title: "Open API",
  description: "Versioned, documented API for crop simulation, recommendation, diagnosis and the shared crop-model registry.",
};

const PRINCIPLES: MessageKey[] = ["developers.principle.open", "developers.principle.data", "developers.principle.privacy", "developers.principle.federate"];

const EXAMPLE = `curl -X POST https://<your-host>/api/v1/simulate \\
  -H "Content-Type: application/json" \\
  -d '{
    "place": { "name": "Malihabad", "state": "Uttar Pradesh", "lat": 26.92, "lon": 80.71 },
    "sowingDate": "2026-11-05",
    "cropId": "mustard",
    "water": "limited",
    "lang": "hi"
  }'`;

export default async function DevelopersPage() {
  const t = createTranslator(await getMessages(await getLang()));
  const groups = Map.groupBy(OPERATIONS, (op) => op.tag);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="display text-4xl font-semibold sm:text-5xl">{t("developers.title")}</h1>
        <p className="mt-3 text-lg text-ink-soft">{t("developers.lead")}</p>
        <Link
          href="/api/v1/openapi.json"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-control bg-leaf-deep px-5 font-medium text-white hover:bg-leaf"
        >
          <FileJson className="size-4" aria-hidden />
          {t("developers.spec")}
        </Link>
      </header>

      <section className="mt-12">
        <h2 className="display text-2xl font-semibold">{t("developers.principles")}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <li key={p} className="border-l-4 border-leaf pl-4 text-ink-soft">
              {t(p)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="display text-2xl font-semibold">{t("developers.tryIt")}</h2>
        <pre className="mt-4 overflow-x-auto rounded-panel bg-ink p-5 text-sm leading-relaxed text-white/90">
          <code>{EXAMPLE}</code>
        </pre>
      </section>

      <section className="mt-12">
        <h2 className="display text-2xl font-semibold">{t("developers.endpoints")}</h2>
        <div className="mt-4 space-y-8">
          {[...groups.entries()].map(([tag, ops]) => (
            <div key={tag}>
              <h3 className="font-semibold text-ink-soft">{tag}</h3>
              <ul className="mt-2 divide-y divide-line rounded-panel border border-line bg-surface">
                {ops.map((op) => (
                  <li key={`${op.method}${op.path}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[4rem_minmax(0,22rem)_1fr] sm:items-baseline sm:gap-4">
                    <span className={`text-xs font-semibold uppercase ${op.method === "get" ? "text-water" : "text-leaf-deep"}`}>{op.method}</span>
                    <code className="text-sm break-all text-ink">{op.path}</code>
                    <span className="text-sm text-ink-soft">{op.summary}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
