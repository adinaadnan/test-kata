# Kata: claim a support ticket

## The problem

Sara and Omar are support agents looking at the same ticket inbox. Neither can tell who is handling a ticket, so both might start working on the same request.

Build **Assign to me**: an agent can claim an unassigned ticket, and everyone can see the saved assignee. Once claimed, the ticket cannot be claimed again.

This is one feature spanning the **frontend, backend, and database**. Work in teams of **2–3 people**, using your AI coding agent. Plan for **45–60 minutes**, including tests and browser proof; have the starter running before the timer begins.

## What you start with

- A working sign-in and sign-out flow with server-side sessions.
- A ticket inbox and ticket detail view, including a mobile layout.
- PostgreSQL containing synthetic users and tickets.
- Separate `frontend/`, `backend/`, and `database/` directories, Dockerfiles, and Docker Compose startup.
- Passing frontend unit tests, backend/API/database tests, and Playwright tests.

| Account | Role |
| --- | --- |
| sara@example.test | Support agent |
| omar@example.test | Support agent |
| amina@example.test | Customer |
| bilal@example.test | Customer |

All demo accounts use `workshop123`. User passwords are stored as salted hashes, not plaintext.

Assignment is not implemented in the starter. You do not need to build login or create a new application.

## What you must build

### Frontend

Add an assignment section to the existing ticket detail view.

- Show **Unassigned** when nobody owns the ticket.
- Let a signed-in support agent click **Assign to me**.
- Disable the action while the request is pending so repeated clicks do not submit additional requests.
- After success, display the assignee's name, for example **Assigned to Sara**.
- Keep the assignment visible after refresh and when another agent opens the ticket.
- If someone else claimed the ticket first, show a useful conflict message and provide a way to refresh the assignment.
- Customers can see the assignment but cannot use the claim action.
- Keep the flow usable on desktop and mobile, including keyboard access.

Example journey:

```text
Sara signs in → opens ticket #1 → sees Unassigned
→ clicks Assign to me → sees Assigned to Sara
→ refreshes → still sees Assigned to Sara

Omar signs in → opens ticket #1 → sees Assigned to Sara
→ cannot replace Sara as the assignee
```

### Backend

Add a claim endpoint, using this contract unless your team agrees on an equivalent one before starting:

```http
POST /api/tickets/:id/assign
```

- Use the existing authenticated session to identify the agent. Do not trust a user ID supplied by the browser.
- Allow support agents to claim tickets; reject customer requests on the server, even if they bypass the UI.
- Claim only an existing, currently unassigned ticket.
- Return the updated ticket on success.
- Include assignment information in ticket reads so refresh and other sessions show the saved result.
- Preserve the current JSON error format: `{ "error": "Useful explanation" }`.

| Situation | Expected HTTP status | Database result |
| --- | --- | --- |
| Agent claims an unassigned ticket | 200 | Assignee saved |
| Request has no valid session | 401 | No change |
| Signed-in customer tries to claim | 403 | No change |
| Agent requests a nonexistent ticket | 404 | No change |
| Ticket already has an assignee, including the same agent | 409 | Original assignee preserved |
| Two agents claim simultaneously | One 200; one 409 | Exactly one saved winner |

### Database

- Add a migration for an optional assignee linked to `users.id` by a foreign key.
- Existing tickets must remain intact and start unassigned.
- Make claiming atomic: concurrent requests must not overwrite one another's assignments.
- Document how to apply the migration to an existing database volume. Rebuilding the database image alone does not apply new init SQL to existing storage.

Agree on the column and response field names as a team. You do not need a new table, an ORM, or a new migration framework just for this exercise.

## Required tests and proof

Write tests through your coding agent, then read the assertions and explain what they prove.

| Test type | Required evidence |
| --- | --- |
| Unit | New UI states and decision logic: unassigned, pending, assigned, and failed/conflicting requests. |
| API + database | Successful claim persists; anonymous and customer requests fail; missing tickets fail; repeated claims preserve the original assignee. |
| Concurrency | Two independent agent sessions claim the same ticket concurrently. Exactly one receives 200, the other receives 409, and the row belongs to the winner. |
| Playwright happy path | Sign in as Sara, open an unassigned ticket, claim it, refresh, and verify Sara remains assigned. |
| Playwright conflict path | Sara and Omar both open an unassigned ticket; Sara claims it first; Omar's stale claim receives helpful conflict feedback and shows the updated assignment. |
| Regression | Existing login, logout, inbox, ticket detail, and responsive flows still pass. |

Use isolated/resettable fixtures so the tests can run repeatedly. Avoid relying on a ticket that happened to be unassigned before a previous run.

Maintain the starter's **100% authored-source coverage gates**. Do not remove tests or lower thresholds to make the suite pass. Coverage measures execution; your assertions must still establish the required behavior.

With the app running, the baseline commands are:

```sh
npm run test:coverage
npm run test:backend
npm run test:e2e
```

Or run all three with `npm run test:all`. Update test fixtures and database setup to apply your migration as needed.

## Suggested team split

Spend the first **5 minutes together** agreeing on the API response, database field, error statuses, and ownership of files.

| Team size | Person | Responsibility |
| --- | --- | --- |
| 3 | 1 | Frontend assignment section and Playwright journeys |
| 3 | 2 | Endpoint, session identity, agent permission checks, API tests |
| 3 | 3 | Migration, atomic claim, concurrency test, integration |
| 2 | 1 | Frontend and Playwright; pair on final integration |
| 2 | 2 | Backend and database; pair on concurrency testing |

Aim to integrate after **25–30 minutes**. Reserve the final **15–20 minutes** for tests, browser proof, and your demo. This is a planning estimate, not a speed competition.

## Out of scope

Do not add ticket resolution, reassignment, reopening, comments, notifications, ticket creation, password reset, or a broad UI redesign. Keep the change focused on claiming and displaying an assignee.

## Definition of done

- The claim feature works across the UI, API, and PostgreSQL.
- Migration preserves existing data and has documented application steps.
- Permission, conflict, concurrency, and persistence requirements have passing tests.
- Both Playwright journeys have browser evidence, such as screenshots or traces.
- Baseline checks and source coverage gates pass after the team's changes are integrated.
- Changes are recorded in small, understandable commits.
- Your team can explain the implementation, show the test commands and results, and name anything left unverified.

You own the result even when the coding agent writes the code and tests.
