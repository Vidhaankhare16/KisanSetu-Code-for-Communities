import type { Metadata } from "next";
import { Planner } from "@/features/plan/Planner";

export const metadata: Metadata = {
  title: "Plan my crop",
  description: "Compare every crop you could sow on your field — profit in good and bad years, water need, risk and soil health.",
};

export default function PlanPage() {
  return <Planner />;
}
