import type { Metadata } from "next";
import { KisanMitra } from "@/features/mitra/KisanMitra";

export const metadata: Metadata = {
  title: "Ask Kisan Mitra",
  description: "Ask farming questions by voice or text in your own language.",
};

export default function MitraPage() {
  return <KisanMitra />;
}
