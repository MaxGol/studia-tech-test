import { useRouter } from "next/router";
import { useState } from "react";
import { trpc } from "~/utils/trpc";
import SessionCard from "~/components/SessionCard";

const STUDENT_ID = "student-01";

export default function TutorSessionsPage() {
  const router = useRouter();
  const tutorId = router.query.tutorId as string;
  const [bookingSessionId, setBookingSessionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: sessions, isLoading, isError, refetch } = trpc.session.getAvailableSessions.useQuery(
    { tutorId },
    { enabled: !!tutorId }
  );

  const bookSession = trpc.session.bookSession.useMutation({
    onSuccess: (booking) => {
      setSuccessMessage(`Booked successfully! Booking ID: ${booking.id}`);
      setErrorMessage(null);
      setBookingSessionId(null);
      refetch();
    },
    onError: (err) => {
      setErrorMessage(err.message);
      setSuccessMessage(null);
      setBookingSessionId(null);
    },
  });

  function handleBook(sessionId: string) {
    setBookingSessionId(sessionId);
    setSuccessMessage(null);
    setErrorMessage(null);
    bookSession.mutate({ studentId: STUDENT_ID, sessionId });
  }

  return (
    <main className="max-w-xl mx-auto p-8 font-sans">
      <button
        onClick={() => router.push("/")}
        className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block cursor-pointer bg-transparent border-none p-0"
      >
        &larr; Back
      </button>

      {sessions && sessions.length > 0 && (
        <div className="mb-6">
          <h1 className="text-xl font-bold m-0">{sessions[0].tutorName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sessions[0].tutorSubject}</p>
        </div>
      )}

      {!sessions?.length && !isLoading && !isError && (
        <h1 className="text-xl font-bold mb-6">Available Sessions</h1>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {isLoading && <p className="text-gray-500">Loading sessions…</p>}

      {isError && (
        <p className="text-red-600">Failed to load sessions. Please try again.</p>
      )}

      {sessions && sessions.length === 0 && (
        <p className="text-gray-500">No available sessions for this tutor.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              title={session.title}
              startsAt={session.startsAt}
              endsAt={session.endsAt}
              spotsRemaining={session.spotsRemaining}
              tutorName={session.tutorName}
              isBooking={bookingSessionId === session.id}
              onBook={() => handleBook(session.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
