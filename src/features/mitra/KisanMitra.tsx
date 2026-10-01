"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Square, Volume2 } from "lucide-react";
import type { ChatResponse } from "@/contracts/api";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Tone";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/translate";
import { api, ApiError } from "@/lib/api";
import { startRecording, type Recorder } from "@/lib/audio";
import { cn } from "@/lib/cn";
import { useField } from "@/lib/fieldStore";
import { PageHeader } from "@/components/shell/PageHeader";

interface Turn {
  role: "user" | "model";
  text: string;
  tools?: ChatResponse["toolCalls"];
}

const EXAMPLES: MessageKey[] = ["mitra.examples.sow", "mitra.examples.rain", "mitra.examples.scheme", "mitra.examples.profit"];

export function KisanMitra() {
  const { t, lang } = useI18n();
  const { place } = useField();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Block bodies on purpose: newer browsers return a Promise from scrollIntoView, and an effect
  // must return nothing or a cleanup function.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, busy]);
  useEffect(() => {
    return () => recorderRef.current?.cancel();
  }, []);

  async function ask(input: { text?: string; audio?: { base64: string; mimeType: "audio/wav" } }) {
    const history = turns.map(({ role, text }) => ({ role, text }));
    const messages = input.text ? [...history, { role: "user" as const, text: input.text }] : history;
    if (input.text) setTurns((ts) => [...ts, { role: "user", text: input.text! }]);
    setBusy(true);
    setNotice(null);
    try {
      const res = await api.chat({ messages, audio: input.audio, place: place ?? undefined, lang });
      setTurns((ts) => [
        ...ts,
        ...(res.transcript ? [{ role: "user" as const, text: res.transcript }] : []),
        { role: "model", text: res.reply, tools: res.toolCalls },
      ]);
    } catch (err) {
      setNotice(err instanceof ApiError && err.code !== "network" ? err.message : t("common.errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      setRecording(false);
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (!recorder) return;
      try {
        const audio = await recorder.stop();
        if (audio.seconds > 0.4) await ask({ audio });
      } catch {
        setNotice(t("common.errorGeneric"));
      }
      return;
    }
    try {
      recorderRef.current = await startRecording();
      setRecording(true);
    } catch {
      setNotice(t("mitra.micBlocked"));
    }
  }

  async function speak(index: number, text: string) {
    audioRef.current?.pause();
    setSpeaking(index);
    try {
      const blob = await api.speak(text, lang);
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setSpeaking(null);
      await audio.play();
    } catch {
      // Fall back to the browser's own voice if cloud speech is unavailable.
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = `${lang}-IN`;
      utterance.onend = () => setSpeaking(null);
      speechSynthesis.speak(utterance);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-10 sm:px-6">
      <PageHeader title={t("mitra.title")} lead={t("mitra.lead")} crops={["rice", "groundnut", "jowar", "moong"]} />

      <div className="mt-8 flex-1 space-y-4" aria-live="polite">
        {turns.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => ask({ text: t(key) })}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink hover:border-leaf"
              >
                {t(key)}
              </button>
            ))}
          </div>
        ) : null}

        {turns.map((turn, i) => (
          <div key={i} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-panel px-4 py-3", turn.role === "user" ? "bg-ink text-white" : "border border-line bg-surface text-ink")}>
              <p className="sr-only">{turn.role === "user" ? t("mitra.you") : t("mitra.mitra")}</p>
              <p className="whitespace-pre-wrap">{turn.text}</p>
              {turn.role === "model" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <button type="button" onClick={() => speak(i, turn.text)} className="inline-flex items-center gap-1 text-water hover:underline">
                    <Volume2 className={cn("size-4", speaking === i && "animate-pulse")} aria-hidden />
                    {t("mitra.play")}
                  </button>
                  {turn.tools?.length ? (
                    <span>
                      {t("mitra.usedTools")}: {turn.tools.map((tool) => tool.summary).join("; ")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {busy ? <p className="animate-pulse text-ink-soft">{t("mitra.thinking")}</p> : null}
        <div ref={endRef} />
      </div>

      {notice ? (
        <div className="mt-4">
          <Notice tone="sun">{notice}</Notice>
        </div>
      ) : null}

      <form
        className="sticky bottom-4 mt-6 flex items-center gap-2 rounded-panel border border-line bg-surface p-2 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text || busy) return;
          setDraft("");
          void ask({ text });
        }}
      >
        <button
          type="button"
          onClick={toggleRecording}
          disabled={busy}
          aria-pressed={recording}
          className={cn(
            "inline-flex size-12 shrink-0 items-center justify-center rounded-full text-white",
            recording ? "animate-pulse bg-alert" : "bg-water hover:bg-water/90",
          )}
        >
          {recording ? <Square className="size-5" /> : <Mic className="size-5" />}
          <span className="sr-only">{recording ? t("mitra.stop") : t("mitra.speak")}</span>
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={recording ? t("mitra.listening") : t("mitra.placeholder")}
          aria-label={t("mitra.placeholder")}
          className="h-12 min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none"
        />
        <Button type="submit" disabled={busy || !draft.trim()} aria-label={t("mitra.send")}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
