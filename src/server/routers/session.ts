import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * ============================================================
 *  SESSION ROUTER — YOUR TASK
 * ============================================================
 *
 *  Implement the four tRPC procedures below. Each procedure has:
 *    - A description of what it should do
 *    - The expected input schema (already defined)
 *    - Hints about edge cases to handle
 *
 *  The Prisma client is available via `ctx.prisma`.
 *  Refer to prisma/schema.prisma for the data model.
 *
 *  Run `npm test` to check your progress — all tests should pass.
 * ============================================================
 */

export const sessionRouter = router({
  /**
   * PROCEDURE 1: getAvailableSessions
   *
   * Return a tutor's FUTURE sessions that still have available capacity.
   *
   * Requirements:
   *   - Only return sessions where startsAt is in the future
   *   - Only return sessions that are NOT fully booked
   *   - A session's booked count should only include "confirmed" bookings
   *     (cancelled bookings do NOT count towards capacity)
   *   - Include the tutor's name and subject in the response
   *   - Include how many spots remain for each session
   *   - Order results by startsAt ascending (soonest first)
   */
  getAvailableSessions: publicProcedure
    .input(
      z.object({
        tutorId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch all future sessions for this tutor, counting only confirmed bookings
      // so that cancelled bookings don't artificially reduce available capacity.
      // Prisma's _count with a where clause lets us do this in a single query.
      const now = new Date();

      const sessions = await ctx.prisma.session.findMany({
        where: {
          tutorId: input.tutorId,
          startsAt: { gt: now },
        },
        include: {
          tutor: { select: { name: true, subject: true } },
          _count: {
            select: {
              bookings: { where: { status: "confirmed" } },
            },
          },
        },
        orderBy: { startsAt: "asc" },
      });

      // Filter out fully booked sessions in-memory (confirmed count >= capacity),
      // then flatten tutor fields and compute spotsRemaining for the client.
      return sessions
        .filter((s) => s._count.bookings < s.capacity)
        .map((s) => ({
          id: s.id,
          title: s.title,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          capacity: s.capacity,
          spotsRemaining: s.capacity - s._count.bookings,
          tutorName: s.tutor.name,
          tutorSubject: s.tutor.subject,
        }));
    }),

  /**
   * PROCEDURE 2: bookSession
   *
   * Book a student into a session.
   *
   * Requirements:
   *   - Validate the session exists and is in the future
   *   - Validate the session is not fully booked (confirmed bookings only)
   *   - Prevent duplicate bookings (same student + same session)
   *     BUT: if the student previously cancelled, allow them to re-book
   *   - Return the created booking with session details
   *
   * Error handling — throw descriptive errors for:
   *   - Session not found
   *   - Session is in the past
   *   - Session is fully booked
   *   - Student already has a confirmed booking for this session
   */
  bookSession: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        sessionId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate the session exists and is still in the future.
      // We count only confirmed bookings here — a cancelled booking does not
      // hold a spot, so it must not block a new booking.
      const now = new Date();

      const session = await ctx.prisma.session.findUnique({
        where: { id: input.sessionId },
        include: { _count: { select: { bookings: { where: { status: "confirmed" } } } } },
      });

      if (!session) throw new Error("Session not found");
      if (session.startsAt <= now) throw new Error("Session is in the past");
      if (session._count.bookings >= session.capacity) throw new Error("Session is fully booked");

      // Check for an existing booking record for this student+session pair.
      // The schema enforces @@unique([studentId, sessionId]), so there can be at most one.
      const bookingKey = { studentId: input.studentId, sessionId: input.sessionId };

      const existing = await ctx.prisma.booking.findUnique({
        where: { studentId_sessionId: bookingKey },
      });

      if (existing?.status === "confirmed") {
        throw new Error("Student already has a confirmed booking for this session");
      }

      // Upsert rather than create: if the student previously cancelled their booking,
      // the unique record already exists and we reactivate it instead of inserting a duplicate.
      return ctx.prisma.booking.upsert({
        where: { studentId_sessionId: bookingKey },
        create: { ...bookingKey, notes: input.notes, status: "confirmed" },
        update: { status: "confirmed", notes: input.notes },
        include: { session: true },
      });
    }),

  /**
   * PROCEDURE 3: cancelBooking
   *
   * Cancel an existing booking.
   *
   * Requirements:
   *   - Find the booking by ID
   *   - Only allow cancellation if the booking status is "confirmed"
   *   - Only allow cancellation if the session hasn't started yet
   *   - Set the booking status to "cancelled" (do NOT delete it)
   *   - Return the updated booking
   *
   * Error handling — throw descriptive errors for:
   *   - Booking not found
   *   - Booking is already cancelled
   *   - Session has already started or passed
   */
  cancelBooking: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the booking with its session so we can validate the session start time.
      // We need session.startsAt to enforce the rule that past sessions cannot be cancelled.
      const now = new Date();

      const booking = await ctx.prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: { session: true },
      });

      if (!booking) throw new Error("Booking not found");
      if (booking.status === "cancelled") throw new Error("Booking is already cancelled");
      if (booking.session.startsAt <= now) throw new Error("Session has already started or passed");

      // Soft-delete: set status to "cancelled" rather than removing the record.
      // This preserves history and keeps the @@unique([studentId, sessionId]) record
      // in place so a re-book can upsert it back to "confirmed" later.
      return ctx.prisma.booking.update({
        where: { id: input.bookingId },
        data: { status: "cancelled" },
      });
    }),

  /**
   * PROCEDURE 4: getStudentBookings
   *
   * Return all bookings for a given student.
   *
   * Requirements:
   *   - Include session details (title, startsAt, endsAt) and tutor name
   *   - Include the booking status
   *   - Order by session startsAt descending (most recent first)
   *   - Optionally filter by status if provided
   */
  getStudentBookings: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        status: z.enum(["confirmed", "cancelled"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch all bookings for the student, joining session and tutor in one query.
      // Prisma treats undefined fields in where as "no filter", so passing
      // status: undefined (when omitted by the caller) returns all statuses.
      const bookings = await ctx.prisma.booking.findMany({
        where: {
          studentId: input.studentId,
          status: input.status,
        },
        include: {
          session: {
            include: { tutor: { select: { name: true } } },
          },
        },
        orderBy: { session: { startsAt: "desc" } },
      });

      // Flatten tutorName to the top level so consumers don't need to
      // navigate booking.session.tutor.name.
      return bookings.map((b) => ({
        id: b.id,
        studentId: b.studentId,
        sessionId: b.sessionId,
        status: b.status,
        notes: b.notes,
        createdAt: b.createdAt,
        session: {
          id: b.session.id,
          title: b.session.title,
          startsAt: b.session.startsAt,
          endsAt: b.session.endsAt,
        },
        tutorName: b.session.tutor.name,
      }));
    }),
});
