# Digital Public Good alignment

How KisanSetu maps to the nine indicators of the [Digital Public Goods Standard](https://digitalpublicgoods.net/standard/).

| # | Indicator | KisanSetu |
|---|---|---|
| 1 | Relevance to the SDGs | SDG 2 (Zero Hunger: productivity and incomes of small-scale food producers, 2.3; sustainable, resilient agriculture, 2.4), SDG 6 (water-use efficiency, 6.4), SDG 13 (climate adaptation, 13.1), SDG 15 (soil health, 15.3). |
| 2 | Open licence | Apache-2.0 for all code. |
| 3 | Clear ownership | Maintained by the KisanSetu team; the copyright notice is in `LICENSE`. |
| 4 | Platform independence | Runs anywhere Node.js 20+ or a container runs. Google Cloud services are optional adapters: Gemini via API key or Vertex AI, storage in memory or Firestore. |
| 5 | Documentation | README, architecture, model documentation with equations and limitations, OpenAPI 3.1 generated from code, and in-app API docs at `/developers`. |
| 6 | Non-PII data extraction | All data the platform produces (national outlook, model cards, anonymised network statistics) is exportable as JSON through the open API. |
| 7 | Privacy and applicable laws | Designed for India's Digital Personal Data Protection Act, 2023: no accounts, no names or phone numbers stored; locations rounded to ~10 km; photos are processed and not stored; the field location stays on the device until advice is requested. |
| 8 | Standards and best practices | OpenAPI 3.1, JSON Schema 2020-12, ISO dates, WCAG-minded UI (keyboard navigation, visible focus, reduced motion, native form controls), FAO-56/FAO-33 methods. |
| 9 | Do no harm | AI output is schema-validated and grounded in model numbers; chemical advice comes only with dose and safety and after IPM options; low-confidence diagnoses escalate to KVK / Kisan Call Centre; forecast and typical-year information are labelled distinctly; rate limiting protects the service. |

## Interoperability between states

- **Shared models.** Crop models are published as versioned *model cards* (`GET /api/v1/models`),
  each validated by a public JSON schema (`CropModelSchema`). A state can calibrate a card
  (for example, potential yield and duration from its AICRP trials) and publish it as
  `mustard@2026.10-RJ` in the same format for other states to reuse.
- **Federation.** Each state can run its own instance; outlooks and model cards are plain JSON over
  HTTP with CORS enabled, so instances can read each other's published data.
- **Swappable data.** Providers are isolated modules, so a state can plug in IMD gridded weather, the
  national Soil Health Card database or Bhuvan layers without touching the model.
