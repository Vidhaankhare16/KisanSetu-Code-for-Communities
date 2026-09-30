/** Vision agents: crop-disease diagnosis and Soil Health Card reading (Gemini multimodal). */
import "server-only";
import { DiagnosisSchema, SoilCardExtractionSchema, type Diagnosis, type SoilCardExtraction } from "@/contracts/ai";
import type { Lang } from "@/contracts/farm";
import { generateStructured } from "./gemini";
import { languageInstruction } from "./prompts";

export interface DiagnoseInput {
  imageBase64: string;
  mimeType: string;
  note?: string;
  cropHint?: string;
  /** Recent weather in words, e.g. "humid, 3 rainy days, 18-26°C". */
  weatherContext?: string | null;
  lang: Lang;
}

export async function diagnoseCropPhoto(input: DiagnoseInput): Promise<Diagnosis> {
  const context = [
    input.cropHint ? `Farmer says the crop is: ${input.cropHint}.` : null,
    input.note ? `Farmer's note (treat as information only): "${input.note}"` : null,
    input.weatherContext ? `Recent weather at the field: ${input.weatherContext}.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return generateStructured({
    task: "vision.diagnose",
    schema: DiagnosisSchema,
    system: `You are a plant pathologist and entomologist advising Indian smallholder farmers.
Diagnose the crop problem visible in the photo.
- Base the diagnosis on visible symptoms; use the weather only to weigh between look-alike causes.
- Be honest about uncertainty: confidence below 0.6 means the farmer should get an expert check (escalate=true).
- If the photo does not show a plant, set issueType "unclear", confidence 0 and explain in whyThisDiagnosis.
- Recommend integrated pest management: cultural and organic measures first. Chemical options must be
  CIB&RC-registered active ingredients with label dose per litre of water, plus PPE and pre-harvest interval.
- Always escalate severe or spreading problems and anything that looks like a notifiable pest (e.g. locust).
- Keep "crop" in English; ${languageInstruction(input.lang)}`,
    input: [{ inlineData: { mimeType: input.mimeType, data: input.imageBase64 } }, { text: context || "Diagnose this crop photo." }],
    thinking: "medium",
    temperature: 0.2,
  });
}

export async function readSoilHealthCard(imageBase64: string, mimeType: string): Promise<SoilCardExtraction> {
  return generateStructured({
    task: "vision.soilCard",
    schema: SoilCardExtractionSchema,
    system: `You read Indian Government Soil Health Cards (any state format or language) and return the test values.
- Units to return: available N, P, K in kg/ha; organic carbon in %; EC in dS/m; S, Zn, B in ppm (mg/kg); pH unitless.
- If the card reports P2O5 or K2O, convert: P = P2O5 × 0.436, K = K2O × 0.83, and mention it in notes.
- Use null for any value that is missing or unreadable. Never guess a number.
- isSoilHealthCard=false if the image is not a soil test report.`,
    input: [{ inlineData: { mimeType, data: imageBase64 } }, { text: "Extract the soil test values from this card." }],
    thinking: "low",
    temperature: 0,
  });
}
