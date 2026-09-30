import type { Metadata } from "next";
import { SchemeChecker } from "@/features/schemes/SchemeChecker";

export const metadata: Metadata = {
  title: "Government schemes",
  description: "Check eligibility for central farmer schemes — PM-KISAN, PMFBY, KCC, PMKSY, PKVY and more — with the reason for every answer.",
};

export default function SchemesPage() {
  return <SchemeChecker />;
}
