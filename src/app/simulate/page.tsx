import type { Metadata } from "next";
import { SimulatorPage } from "@/features/simulator/SimulatorPage";
import { SAMPLE_SEASONS } from "@/server/samples";

export const metadata: Metadata = {
  title: "Season simulator",
  description: "Watch any crop's season unfold day by day on your field — rain, irrigation, stress, pests and harvest.",
};

export default function SimulatePage() {
  return <SimulatorPage samples={Object.values(SAMPLE_SEASONS)} />;
}
