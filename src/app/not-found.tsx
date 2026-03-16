import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-n-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-brand-gradient-subtle">
        <Compass className="h-8 w-8 text-lavender-400" />
      </div>
      <h1 className="mt-6 font-heading text-[32px] font-bold text-n-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-base leading-relaxed text-n-500">
        Looks like this page doesn&apos;t exist. Let&apos;s get you back on track.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-lavender-400 px-8 text-[17px] font-semibold text-white shadow-sm transition-all hover:bg-lavender-500 active:scale-[0.98]"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
