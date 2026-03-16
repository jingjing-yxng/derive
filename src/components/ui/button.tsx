import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ButtonHTMLAttributes, forwardRef } from "react";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 rounded-full",
          {
            "bg-lavender-400 text-white shadow-sm hover:bg-lavender-500 active:scale-[0.98]":
              variant === "primary",
            "border border-n-200 bg-n-0 text-n-900 hover:bg-n-100":
              variant === "secondary",
            "text-n-600 hover:bg-n-100 hover:text-n-900": variant === "ghost",
            "border-[1.5px] border-lavender-400/27 bg-transparent text-lavender-400 hover:bg-lavender-400/5": variant === "outline",
            "bg-rose-400 text-white shadow-sm hover:bg-rose-500 active:scale-[0.98]":
              variant === "danger",
          },
          {
            "h-8 px-4 text-[13px]": size === "sm",
            "h-10 px-6 text-[15px]": size === "md",
            "h-12 px-8 text-[17px]": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
