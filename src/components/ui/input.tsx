import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { InputHTMLAttributes, forwardRef } from "react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 py-3 text-base text-n-900 placeholder:text-n-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/40 focus-visible:border-lavender-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
