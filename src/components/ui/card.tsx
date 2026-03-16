import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { HTMLAttributes, forwardRef } from "react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[32px] border border-n-200 bg-n-0 p-6 shadow-sm transition-all duration-200",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
