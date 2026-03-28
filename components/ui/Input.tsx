import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="label-ui text-bf-text-secondary mb-1.5 block"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-bf-gray-200 bg-white text-bf-text-primary font-serif text-sm",
          "placeholder:text-bf-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat focus:border-transparent",
          "transition-all duration-200",
          error && "border-bf-ruby ring-1 ring-bf-ruby",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-bf-ruby font-sans">{error}</p>
      )}
    </div>
  );
}
