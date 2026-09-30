import type { MessageKey, Translate } from "./translate";

/** Crop name in the UI language, falling back to the catalogue name for unknown crops. */
export function cropLabel(t: Translate, cropId: string, fallback: string): string {
  const key = `cropNames.${cropId}` as MessageKey;
  const label = t(key);
  return label === key ? fallback : label;
}
