# Claim a ticket

Support agents need to know who is handling a ticket. Add **Assign to me** to the existing ticket detail view, and save the assignment in PostgreSQL.

Work in teams of two or three. Allow **45–60 minutes**, including tests and browser proof. Setup is completed before the timer. The feature is deliberately small so you have time to learn your coding agent and inspect its work.

## Acceptance criteria

- An agent sees an unassigned ticket and can assign it to themselves.
- The server derives the assignee from the logged-in session.
- The saved assignee appears after refresh and after signing in as another agent.
- Customers cannot assign tickets, including through a direct API request.
- An already assigned ticket cannot be claimed again. Return 409 with useful feedback.
- Simultaneous claims produce exactly one winner and no overwritten assignment.
- Failed requests leave the assignment unchanged and show an actionable error.
- Existing login, logout, ticket browsing, and tests still work.

Resolution, reassignment, notifications, and ticket creation are out of scope.

## Agree on a contract first — 5 minutes

Suggested route: `POST /api/tickets/:id/assign`. No user ID in the request body. A successful response returns the updated ticket; errors use the existing `{ "error": "..." }` shape. Agree on a database column name, response fields, and status codes before splitting.

Use 401 for no session, 403 for a customer, 404 for a missing ticket, and 409 for an assignment conflict. A database foreign key should link the assignee to a user. The migration must preserve existing records. Existing tickets should start unassigned.

## Split the work

| Team | Person | Responsibility |
| --- | --- | --- |
| Three people | 1 | UI, assignment states, browser journey |
| | 2 | API, role check, validation, API tests |
| | 3 | Migration, atomic update, concurrent-claim test, integration |
| Two people | 1 | UI and Playwright proof |
| | 2 | Backend and database; pair with person 1 on conflict tests |

Meet again after about 25 minutes to integrate. Reserve the final 15–20 minutes for tests, proof, and a short explanation of the change.

## Evidence to deliver

1. Unit tests for any new decision logic; API/database tests for permissions, conflicts, and persistence.
2. A concurrency test: two agent sessions claim one ticket; exactly one succeeds.
3. A Playwright journey: log in as Sara, claim, refresh, and see Sara still assigned.
4. A Playwright failure journey: Omar sees that the ticket is taken and receives useful feedback.
5. Passing baseline tests and maintained 100% source coverage. Coverage alone does not establish correct behavior: explain your assertions.
6. A small commit or PR description with commands run, results, and anything you did not verify.

Ask your coding agent to inspect the repository, propose a small plan, implement, run tests, use a browser, and show evidence. Read the resulting diff yourself.
