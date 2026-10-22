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

The exercise and test commands will be documented as the starter takes shape.
