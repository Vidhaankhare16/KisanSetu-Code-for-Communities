import Link from "next/link";
import { CloudSun, LineChart, MapPin, Mic, ScanLine, Sprout } from "lucide-react";
import { LANGS } from "@/contracts/farm";
import { CROPS } from "@/domain/crops/catalog";
import { SCHEMES } from "@/domain/schemes/catalog";
import { FurrowDivider } from "@/components/shell/FurrowDivider";
import { FieldStrip } from "@/components/shell/PageHeader";
import { HeroField } from "@/features/landing/HeroField";
import { HeroFieldSearch } from "@/features/landing/HeroFieldSearch";
import { SeasonRibbon } from "@/features/landing/SeasonRibbon";
import { cropLabel } from "@/i18n/crops";
import { getLang, getMessages } from "@/i18n/server";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import { shortDate } from "@/lib/format";
import { SAMPLE_SEASONS } from "@/server/samples";

const STEPS = [
  { key: "one", Icon: MapPin },
  { key: "two", Icon: CloudSun },
  { key: "three", Icon: LineChart },
  { key: "four", Icon: Sprout },
] as const;

export default async function HomePage() {
  const lang = await getLang();
  const t = createTranslator(await getMessages(lang));
  const sample = SAMPLE_SEASONS.mustardJaipur;
  const years = sample.ensemble?.members ?? 10;
  const cropName = cropLabel(t, sample.crop.id, sample.crop.name);
  const bloom = sample.stages.find((s) => s.key === "mid");
  const bloomDate = sample.days[bloom ? bloom.startDay + Math.round((bloom.endDay - bloom.startDay) * 0.3) : 0]!.date;

  const facts: { value: number; key: MessageKey }[] = [
    { value: CROPS.length, key: "landing.facts.crops" },
    { value: LANGS.length, key: "landing.facts.languages" },
    { value: years, key: "landing.facts.years" },
    { value: SCHEMES.length, key: "landing.facts.schemes" },
  ];

  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:pt-16">
        <div>
          <h1 className="display max-w-[17ch] text-[2.6rem] font-semibold text-balance text-ink sm:text-6xl">{t("landing.title")}</h1>
          <p className="mt-6 max-w-[60ch] text-lg text-ink-soft">{t("landing.lead")}</p>
          <div className="mt-8">
            <p className="mb-3 font-medium text-ink">{t("field.whereIsField")}</p>
            <HeroFieldSearch />
          </div>
        </div>
        <HeroField simulation={sample} caption={t("landing.heroCaption", { crop: cropName, date: shortDate(bloomDate, lang), place: sample.location.name })} />
      </section>

      <section className="border-y border-line bg-surface">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.key} className="flex items-baseline gap-3">
              <dt className="sr-only">{t(f.key)}</dt>
              <dd className="display text-4xl font-semibold text-leaf-deep tabular">{f.value}</dd>
              <dd className="text-sm text-ink-soft">{t(f.key)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-end">
          <div>
            <h2 className="display text-3xl font-semibold sm:text-4xl">{t("landing.ribbonTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("landing.ribbonLead")}</p>
          </div>
          <SeasonRibbon
            simulation={sample}
            caption={t("landing.ribbonCaption", { crop: cropName, date: shortDate(sample.sowingDate, lang), place: sample.location.name })}
          />
        </div>
      </section>

      <FurrowDivider />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="display text-3xl font-semibold sm:text-4xl">{t("landing.howTitle")}</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
          {STEPS.map(({ key, Icon }, i) => (
            <li key={key}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-leaf-soft text-leaf-deep">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="display text-sm font-semibold text-soil tabular">{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t(`landing.steps.${key}.title`)}</h3>
              <p className="mt-2 text-ink-soft">{t(`landing.steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
        <Link href="/plan" className="mt-10 inline-flex h-12 items-center rounded-control bg-leaf-deep px-6 font-medium text-white hover:bg-leaf">
          {t("landing.cta")}
        </Link>
      </section>

      <FurrowDivider />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2">
        <Link href="/doctor" className="group flex gap-5 rounded-panel border border-line bg-surface p-6 hover:border-line-strong">
          <ScanLine className="size-9 shrink-0 text-alert" aria-hidden />
          <span>
            <span className="display block text-2xl font-semibold group-hover:underline">{t("landing.doctorTitle")}</span>
            <span className="mt-2 block text-ink-soft">{t("landing.doctorBody")}</span>
          </span>
        </Link>
        <Link href="/mitra" className="group flex gap-5 rounded-panel border border-line bg-surface p-6 hover:border-line-strong">
          <Mic className="size-9 shrink-0 text-water" aria-hidden />
          <span>
            <span className="display block text-2xl font-semibold group-hover:underline">{t("landing.mitraTitle")}</span>
            <span className="mt-2 block text-ink-soft">{t("landing.mitraBody")}</span>
          </span>
        </Link>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-panel bg-ink px-6 py-10 text-white sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-end">
            <div>
              <h2 className="display text-3xl font-semibold sm:text-4xl">{t("landing.statesTitle")}</h2>
              <p className="mt-4 max-w-[62ch] text-white/80">{t("landing.statesBody")}</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/network" className="inline-flex h-11 items-center rounded-control bg-white px-5 font-medium text-ink hover:bg-leaf-soft">
                {t("landing.statesDashboard")}
              </Link>
              <Link
                href="/developers"
                className="inline-flex h-11 items-center rounded-control border border-white/40 px-5 font-medium text-white hover:border-white"
              >
                {t("landing.statesApi")}
              </Link>
            </div>
          </div>
          <FieldStrip crops={["rice", "wheat", "bajra", "groundnut", "cotton", "sunflower", "pigeonpea", "maize"]} className="mt-8 block w-full opacity-90" />
        </div>
      </section>
    </>
  );
}
