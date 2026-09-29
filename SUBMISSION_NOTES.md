# Submission Notes

## Test coverage

The test suite includes unit coverage for `taskService` and integration coverage for every existing HTTP endpoint plus task assignment. The latest run reports 26 passing tests and 94.8% statement coverage.

Run it with:

```bash
cd task-api
npm test
npm run coverage
```

## Bugs Found And Fixed

### Pagination skipped the first page

- **Location:** `task-api/src/services/taskService.js`, `getPaginated`
- **Expected:** `page=1&limit=2` returns the first two tasks.
- **Actual:** The offset was calculated as `page * limit`, so page one began at index two.
- **Discovery:** A service test and a route integration test both asserted the documented one-based pagination behavior.
- **Fix:** The offset is now `(page - 1) * limit`.

### Completing a task overwrote its priority

- **Location:** `task-api/src/services/taskService.js`, `completeTask`
- **Expected:** Completion changes status and completion time without changing unrelated task fields.
- **Actual:** Every completed task was assigned `medium` priority, including high-priority tasks.
- **Discovery:** A service test completed a high-priority task and asserted that the priority was preserved.
- **Fix:** Completion now updates only `status` and `completedAt`.

## Assignment Endpoint Design

`PATCH /tasks/:id/assign` requires a non-empty string `assignee`. Leading and trailing whitespace is removed before the value is stored. An unknown task returns 404.

Reassignment replaces the current assignee. This keeps the endpoint idempotent for clients retrying the same request and avoids introducing a separate state or unassignment rule that was not part of the brief.

## With More Time

I would add tests for malformed pagination values, a formal API schema, and time-zone-sensitive overdue boundaries. Before production, I would clarify authentication and authorization, whether assignees should be user records rather than names, the intended semantics of full `PUT` updates, and persistence/concurrency requirements.
