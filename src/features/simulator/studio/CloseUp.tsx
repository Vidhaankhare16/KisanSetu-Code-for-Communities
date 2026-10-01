"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { SimCrop, SimDay, SimStage } from "@/contracts/simulation";
import { plantTint } from "@/features/crops/art/color";
import { Plant } from "@/features/crops/art/Plant";
import { cropArt } from "@/features/crops/art/profiles";
import type { SimulatorLabels } from "./labels";
import { formatDate } from "./utils";

interface CloseUpProps {
  crop: SimCrop;
  cropLabel?: string;
  day: SimDay;
  stage?: SimStage;
  labels: SimulatorLabels;
  onClose: () => void;
}

/** One plant, magnified, exactly as the model has it today — flowers, pods, tubers and all. */
export function CloseUp({ crop, cropLabel, day, stage, labels, onClose }: CloseUpProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  // No close() on cleanup: it fires the dialog's close event, which would unmount the close-up
  // as soon as Strict Mode re-runs this effect. Unmounting the element ends the modal anyway.
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const art = cropArt(crop.id, crop.category);
  const stageProgress = stage ? (day.day - stage.startDay) / Math.max(1, stage.endDay - stage.startDay) : 0;
  const tint = plantTint(day.health, day.waterStress, day.stage, stageProgress);
  // Fit any crop, from 20 cm lentil to 2 m maize, into the frame.
  const h = Math.max(12, day.plantHeightCm);
  const scale = Math.min(2.2, 150 / Math.max(40, h));

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
      className="m-auto w-[min(92vw,34rem)] rounded-panel border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="font-semibold">
          {labels.closeUpTitle.replace("{crop}", cropLabel ?? crop.name).replace("{date}", formatDate(day.date, labels.months))}
        </h3>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-ink/5" aria-label={labels.dismissEvent}>
          <X className="size-4" />
        </button>
      </div>
      <svg viewBox="-110 -200 220 250" className="block w-full bg-linear-to-b from-[#dcecf5] to-[#f3efe2]">
        <rect x="-110" y="0" width="220" height="50" fill="#9b6b42" />
        <rect x="-110" y="0" width="220" height="50" fill="#3f2a18" opacity={(day.soilMoisturePct / 100) * 0.35} />
        <g transform={`scale(${scale})`}>
          <Plant art={art} h={h} cover={day.canopyCover} stage={day.stage} stageProgress={stageProgress} tint={tint} seed={11} showUnderground />
        </g>
      </svg>
      <dl className="grid grid-cols-3 gap-3 px-5 py-4 text-sm">
        <div>
          <dt className="text-xs text-ink-soft">{labels.closeUpHeight}</dt>
          <dd className="font-semibold tabular">{Math.round(day.plantHeightCm)} cm</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">{labels.closeUpHealth}</dt>
          <dd className="font-semibold tabular">{Math.round(day.health)}/100</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">{labels.closeUpStage}</dt>
          <dd className="font-semibold">{stage?.label ?? day.stage}</dd>
        </div>
      </dl>
    </dialog>
  );
}
