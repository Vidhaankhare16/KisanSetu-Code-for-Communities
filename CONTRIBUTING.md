# Contributing

Thank you for helping Indian farmers get better advice.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Before opening a pull request, run `npm run check` (type-check, lint, unit tests). CI also runs a
production build and a container smoke test.

## Where things go

- **Science** belongs in `src/domain`: pure functions with unit tests. Cite the method (FAO-56, ICAR
  guide, notification) in a comment next to any constant.
- **New data sources** go in `src/server/providers`: validate the response with Zod, use `fetchJson`
  (timeouts and retries) and cache per location cell.
- **API changes** start in `src/contracts`; the OpenAPI document updates itself.
- **UI text** goes in `src/i18n/messages/en.ts`; run `npm run i18n:translate` to update other
  languages, then ask a native speaker to review them.

## Crop model calibrations

States and research institutions can propose calibrated parameters for a crop: open an issue with the
model card JSON (see `GET /api/v1/models/{crop}`), the region it applies to, and the trial data or
publication behind it.
