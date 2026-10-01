# Architecture

## Layers

| Layer        | Folder                                      | Rules                                                                                                                                                                             |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts    | `src/contracts`                             | Zod schemas for every API request/response, the simulation, the crop-model format and every AI output. Types are inferred from them; the OpenAPI document is generated from them. |
| Domain       | `src/domain`                                | Pure functions only: no I/O, no clock, no randomness. Crop engine, ET0, soil, scenario assembly, ensemble statistics, economics, regenerative score, ranking, scheme rules.       |
| Providers    | `src/server/providers`                      | One module per open-data source. Each validates responses with Zod, applies timeouts/retries through `fetchJson`, and caches with request coalescing.                             |
| AI           | `src/server/ai`                             | Gemini agents with narrow jobs. `generateStructured` validates every reply against a schema and retries once with the validation errors.                                          |
| Services     | `src/server/services`                       | Orchestration: gather field context → build the weather ensemble → run the domain → ask Gemini to explain → record anonymised network data.                                       |
| Repositories | `src/server/repositories`                   | Storage port with in-memory and Firestore adapters, selected by `DATA_BACKEND`.                                                                                                   |
| HTTP         | `src/server/http`, `src/app/api`            | `apiHandler` gives every route validation, rate limiting, CORS, request ids, typed error mapping and structured logs. Route files are 3–10 lines.                                 |
| UI           | `src/features`, `src/components`, `src/app` | Server components for static and data pages, client components for interaction. Feature folders own their components.                                                             |

## Request flow: `POST /api/v1/recommend`

1. `apiHandler` rate-limits (a recommendation costs 5 units) and validates the body with `RecommendRequestSchema`.
2. `recommendCrops` checks its cache (keyed by a stable hash of the request).
3. `prepareRun` fetches the forecast, SoilGrids profile and MODIS NDVI in parallel. Each has its own
   deadline and fallback. It then loads 10+ years of NASA POWER daily data and assembles the weather
   ensemble.
4. `rankCrops` (domain) simulates every candidate crop across every ensemble member: about 10 crops ×
   10 years × 150 days, which takes milliseconds.
5. In parallel, Gemini writes the advisory and narrates the top three seasons in the farmer's language.
   Failures become a warning; the model's answer is always returned.
6. The anonymised plan is stored for sharing and for the state dashboard.

## Key decisions

- **Science in code, language in AI.** Numbers that farmers act on come from an auditable model. Gemini
  explains, translates, sees and listens, but it cannot change a number: its outputs are
  schema-validated, and prompts forbid inventing figures.
- **Ensemble, not a point forecast.** A single seasonal guess would be false precision. Ten real
  historical seasons plus the live forecast give honest ranges (P10/P50/P90) and probabilities.
- **Open data first.** NASA POWER, MODIS, SoilGrids and Open-Meteo need no keys, so any state can run
  the stack without data agreements. The provider layer is the seam for state data (IMD gridded
  weather, the Soil Health Card database, Bhuvan), which can be swapped in module by module.
- **One container.** Next.js serves the UI and the API from a single Cloud Run service. It is stateless
  apart from caches, so it scales horizontally; Firestore holds shared state.
- **Graceful degradation.** Every external dependency has a timeout and a fallback, and the app works
  fully (minus AI text) with no configuration at all.
- **Privacy by design.** No names, phone numbers or exact coordinates are stored; network records round
  locations to 0.1° (~11 km).

## Scaling

- The domain computation is CPU-light; the heavy parts are upstream fetches, which are cached per
  ~1 km cell (forecast 1 h, history 24 h, soil 7 days, NDVI 12 h) and coalesced across concurrent
  requests.
- For a national rollout, a state would mirror NASA POWER / SoilGrids into Cloud Storage or BigQuery
  (both are open datasets), put Cloud CDN in front of the static assets, and move the rate limiter
  to Memorystore.
