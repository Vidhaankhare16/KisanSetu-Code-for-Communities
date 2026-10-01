"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import type { Place } from "@/contracts/farm";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

interface FieldSearchProps {
  onPick: (place: Place) => void;
  size?: "md" | "lg";
  autoFocus?: boolean;
  className?: string;
}

const DEBOUNCE_MS = 250;

/** Village/district search (combobox pattern) with a GPS shortcut. */
export function FieldSearch({ onPick, size = "md", autoFocus, className }: FieldSearchProps) {
  const { t } = useI18n();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "empty" | "locating" | "denied">("idle");
  const requestRef = useRef(0);

  const searchable = query.trim().length >= 2;
  const visibleResults = searchable ? results : [];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++requestRef.current;
    const timer = setTimeout(async () => {
      setStatus("searching");
      try {
        const { places } = await api.searchPlaces(q);
        if (id !== requestRef.current) return;
        setResults(places);
        setActive(places.length ? 0 : -1);
        setStatus(places.length ? "idle" : "empty");
        setOpen(true);
      } catch {
        if (id === requestRef.current) setStatus("idle");
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(place: Place) {
    setOpen(false);
    setQuery(place.name);
    onPick(place);
  }

  function locate() {
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          pick(await api.reverse(round(coords.latitude), round(coords.longitude)));
        } finally {
          setStatus("idle");
        }
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  }

  const tall = size === "lg" ? "h-14 text-lg" : "h-11 text-[15px]";

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            role="combobox"
            aria-expanded={open && visibleResults.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-label={t("field.whereIsField")}
            autoFocus={autoFocus}
            value={query}
            placeholder={t("field.searchPlaceholder")}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => visibleResults.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(visibleResults.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && active >= 0 && visibleResults[active]) {
                e.preventDefault();
                pick(visibleResults[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
            className={cn(
              "w-full rounded-control border border-line-strong bg-surface pr-3 pl-11 text-ink placeholder:text-ink-faint hover:border-ink-soft focus-visible:border-water",
              tall,
            )}
          />
        </div>
        <button
          type="button"
          onClick={locate}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-control border border-line-strong bg-surface px-4 font-medium text-ink hover:border-ink-soft",
            tall,
          )}
        >
          <LocateFixed className="size-5 text-water" aria-hidden />
          {status === "locating" ? t("field.locating") : t("field.useMyLocation")}
        </button>
      </div>

      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-soft">
        {status === "denied" ? t("field.locationDenied") : status === "empty" ? t("field.noResults") : ""}
      </p>

      {open && visibleResults.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-[-1.25rem] w-full overflow-hidden rounded-control border border-line bg-surface shadow-lg sm:w-[calc(100%-11rem)]"
        >
          {visibleResults.map((p, i) => (
            <li
              key={`${p.lat},${p.lon}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(p)}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-start gap-3 px-4 py-3", i === active && "bg-leaf-soft")}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
              <span>
                <span className="block font-medium text-ink">{p.name}</span>
                <span className="block text-sm text-ink-soft">{[p.district, p.state].filter(Boolean).join(", ")}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const round = (v: number) => Math.round(v * 10_000) / 10_000;
