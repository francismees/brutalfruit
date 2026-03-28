import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "rosegold" | "ruby" | "muted" | "success";
  className?: string;
}

const variantStyles = {
  rosegold:
    "bg-rosegold text-white",
  ruby:
    "bg-bf-ruby text-white",
  muted:
    "bg-bf-gray-200 text-bf-gray-700",
  success:
    "bg-emerald-100 text-emerald-800",
};

export function Badge({ children, variant = "muted", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans font-medium tracking-wide uppercase",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
