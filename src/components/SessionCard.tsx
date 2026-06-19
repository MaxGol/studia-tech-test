import React from "react";

interface SessionCardProps {
  title: string;
  startsAt: Date;
  endsAt: Date;
  spotsRemaining: number;
  tutorName: string;
  isBooked: boolean;
  isBooking: boolean;
  isCancelling: boolean;
  onBook: () => void;
  onCancel: () => void;
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionCard({
  title,
  startsAt,
  endsAt,
  spotsRemaining,
  tutorName,
  isBooked,
  isBooking,
  isCancelling,
  onBook,
  onCancel,
}: SessionCardProps) {
  const isFull = spotsRemaining === 0;

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-base font-semibold m-0">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{tutorName}</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
            isFull
              ? "bg-red-100 text-red-700"
              : spotsRemaining <= 2
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {isFull ? "Full" : `${spotsRemaining} spot${spotsRemaining === 1 ? "" : "s"} left`}
        </span>
      </div>

      <p className="text-sm text-gray-600 m-0">
        {formatDateTime(startsAt)} &ndash; {new Date(endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </p>

      {isBooked ? (
        <button
          onClick={onCancel}
          disabled={isCancelling}
          className={`mt-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
            isCancelling
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-red-600 border border-red-300 hover:bg-red-50 cursor-pointer"
          }`}
        >
          {isCancelling ? "Cancelling…" : "Cancel booking"}
        </button>
      ) : (
        <button
          onClick={onBook}
          disabled={isFull || isBooking}
          className={`mt-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
            isFull || isBooking
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          }`}
        >
          {isBooking ? "Booking…" : isFull ? "Full" : "Book"}
        </button>
      )}
    </div>
  );
}
