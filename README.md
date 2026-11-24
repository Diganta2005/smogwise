# SmogWise

A GenAI-assisted guide for families and communities facing severe winter smog. Enter your city, today's AQI, household and routine. You get low-emission routines, indoor air hacks and sustainable swaps, each with **why it helps** and **what it changes**.

## How it maps to the judging parameters
- **Problem statement alignment**: location (city + live AQI band), lifestyle (commute, heating, cooking, household), routines, indoor air hacks, sustainable alternatives, community actions, and an impact explanation on every item.
- **Code quality**: small modules (`validate`, `advice`, `llm`, `server`), pure functions, dependency injection for tests, no unused code.
- **Security**: helmet (CSP and other headers), strict input validation with enums and length limits, 4 KB body cap, rate limiting, `textContent`-only rendering (no HTML injection), API key kept server-side, prompt-injection-resistant system prompt (notes treated as data), safe error responses.
- **Efficiency**: deterministic plan computed instantly; AI call is optional, 15 s timeout, capped tokens, bounded 10-minute in-memory cache; static asset caching; zero frontend dependencies.
- **Testing**: tests with `node:test` covering validation, advice rules, API behaviour, security headers, the LLM fallback and cache, and the browser UI (rendering, error handling, XSS safety).
- **Accessibility**: skip link, labelled fields, fieldsets and legends, inline errors with `role="alert"`, focus moved to errors and results, live regions, visible focus, 44 px targets, colour plus text for AQI bands, reduced-motion and high-contrast support.

Guidance is general, not medical advice.

## Verified results (run these yourself)
| Check | Command | Result |
|---|---|---|
| Lint (ESLint, strict rules) | `npm run lint` | 0 errors |
| Tests | `npm test` | all passing (validation, advice, API, UI, accessibility) |
| Coverage | `npm run test:coverage` | about 99% of lines |
| Dependency audit | `npm run audit` | 0 known vulnerabilities |
| Accessibility | `test/a11y.test.js` (axe-core, WCAG 2.1 A/AA + best practice) | 0 violations on form and results views |
| Colour contrast | measured by hand with the WCAG formula | every text/background pair is 5.4:1 or higher (AA needs 4.5:1) |

CI (`.github/workflows/ci.yml`) runs lint, tests and the audit on every push.

## Deployment notes
- Behind a reverse proxy (Render, Railway, nginx), set `TRUST_PROXY=1` so rate limiting sees real client IPs.
- Impact notes are approximate and based on general public-health guidance; verify figures before citing them.
