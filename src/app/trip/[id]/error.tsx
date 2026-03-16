"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Trip error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-n-50 p-6">
      <div className="w-full max-w-md rounded-[32px] border border-n-200 bg-n-0 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <span className="text-2xl text-rose-500">!</span>
        </div>
        <h2 className="font-heading text-lg font-bold text-n-900">Trip loading failed</h2>
        <p className="mt-2 text-sm text-n-500">
          We couldn&apos;t load this trip. It may have been deleted or there was a network issue.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-full bg-lavender-400 px-6 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-lavender-500"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border-[1.5px] border-n-200 bg-n-0 px-6 py-2.5 text-[15px] font-medium text-n-900 transition-colors hover:bg-n-100"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
