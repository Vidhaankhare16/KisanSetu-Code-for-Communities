# Security

Please report vulnerabilities privately by email to the maintainer listed on the GitHub profile, not
in public issues. We aim to acknowledge reports within 3 working days.

## Design safeguards

- All API input is validated with Zod schemas; bodies over the documented limits are rejected.
- Per-client rate limiting, with expensive AI endpoints costing more.
- No personal data is stored. Photos and audio are processed in memory and discarded; network
  records keep only coarse (~10 km) locations.
- Production runs on Cloud Run with a dedicated least-privilege service account and reaches Gemini
  through Vertex AI, so no API keys are deployed.
- Security headers (HSTS, frame denial, no MIME sniffing, a restrictive Permissions-Policy) are set
  for all responses.
- System prompts treat user text and data as information, never as instructions, and AI output is
  schema-validated before use.
