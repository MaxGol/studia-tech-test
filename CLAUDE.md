# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A full-stack engineering test for Studia — a tutor booking platform. Students book into tutor-led livestream sessions. The task is to implement a tRPC session router and two React frontend components.

## Commands

```bash
npm install              # install dependencies
cp .env.example .env     # first-time setup
npm run db:setup         # push Prisma schema + seed (run once after clone)
npm run dev              # Next.js dev server on :3000
npm test                 # run all 19 Vitest tests (how Part 1 is graded)
npm run test:watch       # watch mode
npx prisma studio        # inspect the SQLite database visually
```

To run a single test by name:
```bash
npx vitest run -t "cancels a confirmed booking"
```

## Architecture

### Data model (Prisma / SQLite)

Four models: `Tutor → Session → Booking ← Student`. Key constraints:
- `Booking.status`: `"confirmed"` | `"cancelled"` (soft-delete pattern — never hard-delete)
- `@@unique([studentId, sessionId])` on `Booking` — upsert on re-book after cancellation
- Capacity enforcement is application-level: count `confirmed` bookings, compare to `Session.capacity`

### tRPC server

- `src/server/trpc.ts` — initialises tRPC with superjson transformer; exposes `router` and `publicProcedure`
- `publicProcedure` middleware injects `ctx.prisma` (singleton from `src/server/db.ts`)
- `src/server/routers/_app.ts` — root router; mounts `sessionRouter` under the `session` namespace
- **`src/server/routers/session.ts`** — the file to implement; four procedures stubbed with `throw new Error("Not implemented")`

### Frontend

- `src/utils/trpc.ts` — `createTRPCNext` client; use `trpc.<procedure>.<query|mutation>()` hooks
- `src/components/SessionCard.tsx` — card component to implement (displays a session + booking button)
- `src/pages/sessions/[tutorId].tsx` — dynamic page to implement (lists available sessions, handles booking flow)
- Path alias `~` resolves to `src/`

### Tests

- `__tests__/setup.ts` reseeds the entire database before **each** test — tests are order-independent
- Seed IDs are deterministic strings (`"tutor-maths-01"`, `"session-future-01"`, etc.) — safe to reference in the implementation
- Do not modify test files, the Prisma schema, or `src/server/trpc.ts` / `src/server/db.ts` / `src/server/routers/_app.ts`

## Key implementation notes

- **Re-booking**: use Prisma `upsert` on the `@@unique([studentId, sessionId])` key — update status to `"confirmed"` if a cancelled record exists, create otherwise
- **Capacity check**: `WHERE status = "confirmed"` — cancelled bookings must not count
- **Past-session guard**: compare `session.startsAt` to `new Date()` before booking or cancellation
- **`spotsRemaining`**: computed field expected by tests — `session.capacity - confirmedBookingCount`
- **`tutorName` / `tutorSubject`**: flattened fields expected by `getAvailableSessions` and `getStudentBookings` — not nested under `tutor`
