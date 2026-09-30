"use client";

import { useEffect, useState } from "react";

const DAYS_PER_SECOND = 12;

/**
 * Day-by-day playback state for a season of `length` days.
 * Callers remount the owning component (via `key`) for a new season, which resets playback.
 */
export function usePlayback(length: number) {
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setDay((d) => {
        if (d >= length - 1) {
          setPlaying(false);
          return d;
        }
        return d + 1;
      });
    }, 1000 / DAYS_PER_SECOND);
    return () => clearInterval(timer);
  }, [playing, length]);

  return {
    day,
    playing,
    seek: (d: number) => setDay(Math.max(0, Math.min(length - 1, Math.round(d)))),
    toggle: () => {
      if (!playing && day >= length - 1) setDay(0);
      setPlaying((p) => !p);
    },
    restart: () => {
      setDay(0);
      setPlaying(true);
    },
  };
}
