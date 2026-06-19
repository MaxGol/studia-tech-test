import { useRouter } from "next/router";
import { useState } from "react";
import { trpc } from "~/utils/trpc";
import SessionCard from "~/components/SessionCard";

const STUDENT_ID = "student-01";

type Feedback = { type: "success" | "error"; text: string };

export default function TutorSessionsPage() {
  const router = useRouter();
  const tutorId = router.query.tutorId as string;
  const [bookingSessionId, setBookingSessionId] = useState<string | null>(null);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const { data: sessions, isLoading, isError, refetch: refetchSessions } = trpc.session.getAvailableSessions.useQuery(
    { tutorId },
    { enabled: !!tutorId }
  );

  const { data: myBookings, refetch: refetchMyBookings } = trpc.session.getStudentBookings.useQuery(
    { studentId: STUDENT_ID, status: "confirmed" },
  );

  // Map of sessionId → bookingId for the student's confirmed bookings.
  // Used to show Cancel button and to pass the correct bookingId to cancelBooking.
  const bookedSessionMap = new Map(myBookings?.map((b) => [b.sessionId, b.id]) ?? []);

  const bookSession = trpc.session.bookSession.useMutation({
    onSuccess: (booking) => {
      setFeedback({ type: "success", text: `Booked successfully! Booking ID: ${booking.id}` });
      setBookingSessionId(null);
      refetchSessions();
      refetchMyBookings();
    },
    onError: (err) => {
      setFeedback({ type: "error", text: err.message });
      setBookingSessionId(null);
      refetchMyBookings();
    },
  });

  const cancelBooking = trpc.session.cancelBooking.useMutation({
    onSuccess: () => {
      setFeedback({ type: "success", text: "Booking cancelled successfully." });
      setCancellingSessionId(null);
      refetchSessions();
      refetchMyBookings();
    },
    onError: (err) => {
      setFeedback({ type: "error", text: err.message });
      setCancellingSessionId(null);
    },
  });

  function handleBook(sessionId: string) {
    setBookingSessionId(sessionId);
    setFeedback(null);
    bookSession.mutate({ studentId: STUDENT_ID, sessionId });
  }

  function handleCancel(sessionId: string) {
    const bookingId = bookedSessionMap.get(sessionId);
    if (!bookingId) return;
    setCancellingSessionId(sessionId);
    setFeedback(null);
    cancelBooking.mutate({ bookingId });
  }

  const tutor = sessions?.[0];

  return (
    <main className="max-w-xl mx-auto p-8 font-sans">
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block cursor-pointer bg-transparent border-none p-0"
      >
        &larr; Back
      </button>

      {!isLoading && !isError && (
        <div className="mb-6">
          <h1 className="text-xl font-bold m-0">{tutor?.tutorName ?? "Available Sessions"}</h1>
          {tutor && <p className="text-sm text-gray-500 mt-0.5">{tutor.tutorSubject}</p>}
        </div>
      )}

      {feedback && (
        <div className={`mb-4 p-3 rounded text-sm border ${
          feedback.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {feedback.text}
        </div>
      )}

      {isLoading && <p className="text-gray-500">Loading sessions…</p>}
      {isError && <p className="text-red-600">Failed to load sessions. Please try again.</p>}

      {sessions && (
        sessions.length === 0
          ? <p className="text-gray-500">No available sessions for this tutor.</p>
          : <div className="flex flex-col gap-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  title={session.title}
                  startsAt={session.startsAt}
                  endsAt={session.endsAt}
                  spotsRemaining={session.spotsRemaining}
                  tutorName={session.tutorName}
                  isBooked={bookedSessionMap.has(session.id)}
                  isBooking={bookingSessionId === session.id}
                  isCancelling={cancellingSessionId === session.id}
                  onBook={() => handleBook(session.id)}
                  onCancel={() => handleCancel(session.id)}
                />
              ))}
            </div>
      )}
    </main>
  );
}
