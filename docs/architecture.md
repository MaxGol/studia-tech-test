# Architecture

## Overview

Studia is a full-stack Next.js application for booking tutor-led sessions. The stack is:

- **Next.js 14** — React framework (Pages Router)
- **tRPC v10** — end-to-end type-safe API layer
- **Prisma** — ORM with SQLite database
- **Zod** — runtime input validation on all tRPC procedures
- **TailwindCSS** — utility-first styling
- **Vitest** — test runner

---

## Request flow

```
Browser
  └─ trpc client (src/utils/trpc.ts)
       └─ HTTP POST /api/trpc/[procedure]
            └─ Next.js API route (src/pages/api/trpc/[trpc].ts)
                 └─ tRPC handler → appRouter
                      └─ sessionRouter (src/server/routers/session.ts)
                           └─ Prisma → SQLite (prisma/dev.db)
```

Every API call goes through a single Next.js catch-all route (`/api/trpc/[trpc]`). The tRPC handler receives the request, resolves the procedure from `appRouter`, injects `ctx.prisma`, and executes the handler.

---

## Key files

| File | Role |
|---|---|
| `src/server/trpc.ts` | Initialises tRPC; defines `router` and `publicProcedure` with `ctx.prisma` injected |
| `src/server/db.ts` | Singleton Prisma client (cached on `globalThis` to survive Next.js hot-reloads) |
| `src/server/routers/_app.ts` | Root router — mounts `sessionRouter` under the `session` namespace |
| `src/server/routers/session.ts` | All four booking procedures (see below) |
| `src/pages/api/trpc/[trpc].ts` | Next.js API handler; bridges HTTP ↔ tRPC |
| `src/utils/trpc.ts` | tRPC React client; exports `trpc` hooks used in pages/components |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Seeds realistic data for manual testing |

---

## Data model

```
Tutor ──< Session ──< Booking >── Student
```

- A **Tutor** has many **Sessions**
- A **Session** has a `capacity` and many **Bookings**
- A **Booking** links one Student to one Session
- `Booking.status`: `"confirmed"` | `"cancelled"` — bookings are never hard-deleted
- `@@unique([studentId, sessionId])` — one booking record per student+session pair, reused on re-book

Capacity enforcement is **application-level**: procedures count `confirmed` bookings and compare to `session.capacity`. Cancelled bookings do not consume a spot.

---

## Session router procedures

| Procedure | Type | Description |
|---|---|---|
| `getAvailableSessions` | query | Future sessions for a tutor with open spots; returns `spotsRemaining`, `tutorName`, `tutorSubject` |
| `bookSession` | mutation | Books a student; validates future/not-full/no-duplicate; upserts to support re-booking after cancellation |
| `cancelBooking` | mutation | Soft-cancels a confirmed booking if the session hasn't started |
| `getStudentBookings` | query | All bookings for a student with session + tutor details; optional status filter |

---

## Frontend structure

```
src/pages/
  index.tsx                   — landing page; lists tutors
  sessions/[tutorId].tsx      — tutor's available sessions + booking flow

src/components/
  SessionCard.tsx             — single session card; handles available / booked / full / booking-in-progress states
```

### State management in `[tutorId].tsx`

| State | Purpose |
|---|---|
| `bookingSessionId` | ID of the session currently being booked — drives per-card loading spinner |
| `feedback` | Single `{ type, text }` banner for success or error after a mutation |
| `bookedSessionIds` | `Set` derived from `getStudentBookings` — prevents showing Book on already-confirmed sessions |

After a successful booking, both `getAvailableSessions` and `getStudentBookings` are refetched so spot counts and booked state stay in sync.

---

## Testing

Tests live in `__tests__/session.test.ts` and use `appRouter.createCaller()` to call procedures directly — no HTTP layer. The setup file (`__tests__/setup.ts`) reseeds the database before **each** test using deterministic IDs (`"student-01"`, `"session-future-01"`, etc.), making tests fully order-independent.

Run all tests:
```bash
npm test
```

Run a single test by name:
```bash
npx vitest run -t "cancels a confirmed booking"
```

---

## Development database

SQLite file at `prisma/dev.db` (gitignored). Reset with:

```bash
npm run db:seed      # reseed only (preserves schema)
npm run db:setup     # push schema + reseed (full reset)
npx prisma studio    # visual DB browser
```
