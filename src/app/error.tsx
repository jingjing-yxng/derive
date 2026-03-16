"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-n-50 p-6">
      <div className="w-full max-w-md rounded-[32px] border border-n-200 bg-n-0 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <span className="text-2xl text-rose-500">!</span>
        </div>
        <h2 className="font-heading text-lg font-bold text-n-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-n-500">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-lavender-400 px-6 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-lavender-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
