import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "gradient" | "outline" | "ruby" | "ghost";
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "gradient",
  children,
  className,
  ...props
}: ButtonProps) {
  const baseClass =
    variant === "gradient"
      ? "btn-gradient"
      : variant === "outline"
        ? "btn-outline"
        : variant === "ruby"
          ? "btn-ruby"
          : "btn-outline border-transparent";

  return (
    <button className={cn(baseClass, className)} {...props}>
      {children}
    </button>
  );
}
