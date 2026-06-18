# Implementation Progress

## Status

| # | Procedure / Component | File | Status |
|---|---|---|---|
| 1 | `getAvailableSessions` | `src/server/routers/session.ts` | ⬜ Pending |
| 2 | `bookSession` | `src/server/routers/session.ts` | ⬜ Pending |
| 3 | `cancelBooking` | `src/server/routers/session.ts` | ⬜ Pending |
| 4 | `getStudentBookings` | `src/server/routers/session.ts` | ⬜ Pending |
| 5 | `SessionCard` component | `src/components/SessionCard.tsx` | ⬜ Pending |
| 6 | `sessions/[tutorId]` page | `src/pages/sessions/[tutorId].tsx` | ⬜ Pending |

## Part 1 — Backend (graded by `npm test`, 19 tests)

### 1. `getAvailableSessions`
- Return future sessions for a tutor that still have capacity
- Only count `"confirmed"` bookings toward capacity (cancelled ones don't count)
- Include `spotsRemaining` (capacity − confirmed booking count) as a computed field
- Include `tutorName` and `tutorSubject` as flattened fields (not nested)
- Order by `startsAt` ascending

### 2. `bookSession`
- Validate session exists, is in the future, is not fully booked
- Reject if student already has a `"confirmed"` booking for this session
- Allow re-booking if student previously cancelled — use upsert on `@@unique([studentId, sessionId])`
- Return the booking with session details

### 3. `cancelBooking`
- Find booking by ID; throw if not found
- Throw if already `"cancelled"`
- Throw if session has already started (`startsAt <= now`)
- Soft-delete: set `status = "cancelled"`, do not remove the record
- Return the updated booking

### 4. `getStudentBookings`
- Return all bookings for a student, with session details and flattened `tutorName`
- Support optional `status` filter (`"confirmed"` | `"cancelled"`)
- Order by `session.startsAt` descending

## Part 2 — Frontend (manually reviewed)

### 5. `SessionCard` component
- Display: session title, start/end time, `spotsRemaining`, tutor name
- Booking button with loading and error states
- Props: session data + `onBook` callback

### 6. `sessions/[tutorId]` page
- Read `tutorId` from route params
- Call `trpc.session.getAvailableSessions`
- Render a list of `SessionCard` components
- Wire up `bookSession` mutation; handle success, loading, and error feedback

## Test baseline

Run `npm test` to check progress. Starting state: **6 passed, 13 failed**.

Tests are fully independent — each reseeds the database before running.
