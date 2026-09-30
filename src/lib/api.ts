/** Typed browser client for the KisanSetu API. Errors surface the server's message. */
import type {
  ChatInput,
  ChatResponse,
  DiagnoseResponse,
  EligibilityProfile,
  FieldContextResponse,
  RecommendInput,
  RecommendResponse,
  SimulateInput,
  SimulateResponse,
} from "@/contracts/api";
import type { SoilCardExtraction } from "@/contracts/ai";
import type { Place } from "@/contracts/farm";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("network", "network", 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
    throw new ApiError(body?.error?.message ?? `HTTP ${res.status}`, body?.error?.code ?? "http", res.status);
  }
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  searchPlaces: (q: string) => request<{ places: Place[] }>(`/api/v1/places?${new URLSearchParams({ q })}`),
  reverse: (lat: number, lon: number) => request<Place>(`/api/v1/places/reverse?lat=${lat}&lon=${lon}`),
  context: (p: Place) =>
    request<FieldContextResponse>(
      `/api/v1/context?${new URLSearchParams({
        lat: String(p.lat),
        lon: String(p.lon),
        name: p.name,
        ...(p.district ? { district: p.district } : {}),
        ...(p.state ? { state: p.state } : {}),
      })}`,
    ),
  recommend: (body: RecommendInput) => post<RecommendResponse>("/api/v1/recommend", body),
  simulate: (body: SimulateInput) => post<SimulateResponse>("/api/v1/simulate", body),
  diagnose: (body: Record<string, unknown>) => post<DiagnoseResponse>("/api/v1/diagnose", body),
  soilCard: (body: { imageBase64: string; mimeType: string }) => post<SoilCardExtraction>("/api/v1/soil-card", body),
  chat: (body: ChatInput) => post<ChatResponse>("/api/v1/chat", body),
  eligibility: (body: Partial<EligibilityProfile>) =>
    post<{ matches: { scheme: SchemeDto; result: { eligible: boolean; reason: string } }[] }>("/api/v1/schemes/eligibility", body),
  speak: async (text: string, lang: string): Promise<Blob> => {
    const res = await fetch("/api/v1/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (!res.ok) throw new ApiError("speech unavailable", "speech", res.status);
    return res.blob();
  },
};

export interface SchemeDto {
  id: string;
  name: string;
  ministry: string;
  benefit: string;
  details: string[];
  howToApply: string;
  url: string;
  regenerative: boolean;
}
