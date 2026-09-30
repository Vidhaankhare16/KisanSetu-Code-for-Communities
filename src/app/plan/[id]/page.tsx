import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Planner } from "@/features/plan/Planner";
import { networkRepository } from "@/server/repositories";

export const metadata: Metadata = { title: "Shared crop plan" };

/** A plan shared by link (e.g. an FPO officer sending it to a farmer's phone). */
export default async function SharedPlanPage({ params }: PageProps<"/plan/[id]">) {
  const { id } = await params;
  const rec = await (await networkRepository()).getRecommendation(id);
  if (!rec) notFound();
  return <Planner initial={rec} />;
}
