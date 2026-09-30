import type { Metadata } from "next";
import { CropDoctor } from "@/features/doctor/CropDoctor";

export const metadata: Metadata = {
  title: "Crop doctor",
  description: "Photograph a sick plant and get a likely diagnosis with safe, low-cost treatment.",
};

export default function DoctorPage() {
  return <CropDoctor />;
}
