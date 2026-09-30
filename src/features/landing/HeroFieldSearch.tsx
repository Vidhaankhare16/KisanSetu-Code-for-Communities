"use client";

import { useRouter } from "next/navigation";
import { FieldSearch } from "@/features/field/FieldSearch";
import { useField } from "@/lib/fieldStore";

/** Picking a field on the landing page takes the farmer straight into planning. */
export function HeroFieldSearch() {
  const router = useRouter();
  const { setPlace } = useField();
  return (
    <FieldSearch
      size="lg"
      onPick={(place) => {
        setPlace(place);
        router.push("/plan");
      }}
    />
  );
}
