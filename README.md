# Desk

A small support inbox for the FDE workshop. Sign in, browse tickets, and open a ticket to read its details.

## Run

```sh
docker compose up --build
```

Open http://localhost:8088. The database persists across restarts. Stop with `docker compose down`.

## Demo accounts

All accounts use the local workshop password `workshop123`.

| Email | Role |
| --- | --- |
| sara@example.test | Support agent |
| omar@example.test | Support agent |
| amina@example.test | Customer |
| bilal@example.test | Customer |

These accounts and ticket records are synthetic.

## Layout

- `frontend/`: browser interface and Nginx API proxy.
- `backend/`: Python API and server-side sessions.
- `database/`: PostgreSQL schema and migrations.
- `tests/`: browser and database integration tests.



## The exercise

Read [EXERCISE.md](EXERCISE.md). Participants implement ticket claiming; it is intentionally absent from the starter.

## Test

Requires Node.js 24+ and Docker Compose. Browser tests run against the app started above.

```sh
npm install
npm run build
npm run test:coverage
npx playwright install chromium webkit
npm run test:e2e
```

Backend tests use a **separate disposable PostgreSQL instance** and do not touch the application's data:

```sh
docker compose -p desk-tests -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from backend-tests
docker compose -p desk-tests -f compose.test.yaml down
```

Frontend TypeScript and React components have 100% statement, branch, function, and line thresholds. Backend Python has a 100% line/branch gate. Entry modules, API handlers, session helpers, database connections, and demo seeding are included. Dependencies, configuration, HTML, CSS, and SQL do not have executable-source percentage metrics; schema constraints and SQL behavior are exercised against real PostgreSQL. Unit tests simulate browser state and API failures; Playwright exercises the running containers in Chrome, WebKit, and mobile Chrome.

Reports are generated under `coverage/` and `playwright-report/`. Browser screenshots and failure traces are in `test-results/`; use `npx playwright show-report` to inspect the report. The same checks are configured in `.github/workflows/test.yml`.

## Data and local development

- Frontend: React with strict TypeScript, bundled by Vite and served by Nginx. `/api/` is proxied to the backend. `frontend/app.tsx` manages sessions and selection; `frontend/views.tsx` contains the screen components; `frontend/api.ts` and `frontend/types.ts` define the typed API client and domain models.
- Backend: Flask, Gunicorn, Psycopg; opaque HttpOnly session cookie, server-side session expiry.
- Database: PostgreSQL 17. Schema is in `database/001-init.sql`; synthetic demo records are seeded by `backend/seed.py` on startup without resetting existing rows.
- Only the frontend is published by the app Compose file, bound to `127.0.0.1:8088`. The test database uses localhost port 55439.
- `npm run build` type-checks the frontend and its unit tests, then builds `frontend/dist/`. The Docker build runs the same checks. CI runs both the build and coverage gate.
- For frontend hot reload, run `npm run dev`. Vite proxies `/api` to `http://127.0.0.1:8000`; run the backend there, or use Docker Compose for the complete app.
- After editing the app, run `docker compose up -d --build` to rebuild it.
- To inspect data: `docker compose exec db psql -U workshop -d supportdesk`.
- Put new migrations in `database/migrations/` and document how to apply them. Postgres init scripts run only when the data volume is first created; rebuilding an image does not apply a migration to existing data.

Run this synthetic workshop environment locally. The demo accounts, HTTP cookie configuration, and known password are for workshop use.

## Present the login flow

With the app running, launch a visible Chromium browser and Playwright Inspector:

```sh
npm run demo:login
```

The demo pauses three times: on the login screen, with Sara's credentials filled, and after the inbox assertions pass. Click **Resume** in Playwright Inspector at each pause (or press F8 while the Inspector is focused). Actions run slowly enough to narrate. The browser stays open at the final pause until you resume. Stop early with Ctrl+C in the terminal.

This demo has its own config and is excluded from the regular automated suite. To verify its complete flow without pauses:

```sh
DESK_DEMO_AUTO=1 npm run demo:login
```
