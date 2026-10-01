"use client";

/**
 * The farmer's current field, remembered on this device (never sent anywhere until they ask
 * for advice), so the planner, simulator, crop doctor and Kisan Mitra all share the location.
 * Backed by localStorage through useSyncExternalStore, so tabs stay in sync.
 */
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Place } from "@/contracts/farm";

const KEY = "ks_field_v1";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage blocked (private mode)
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(place: Place | null) {
  try {
    if (place) localStorage.setItem(KEY, JSON.stringify(place));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
  listeners.forEach((l) => l());
}

const noopSubscribe = () => () => {};

interface FieldValue {
  place: Place | null;
  setPlace: (place: Place | null) => void;
  /** False during server render and hydration, before the stored field is known. */
  ready: boolean;
}

const FieldContext = createContext<FieldValue | null>(null);

export function FieldProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const place = useMemo<Place | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Place;
    } catch {
      return null;
    }
  }, [raw]);
  const setPlace = useCallback((next: Place | null) => write(next), []);
  const value = useMemo(() => ({ place, setPlace, ready }), [place, setPlace, ready]);
  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}

export function useField(): FieldValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error("useField must be used inside <FieldProvider>");
  return ctx;
}
