import { Calendar } from "lucide-react";
import { cn, formatEventDate } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  error?: string;
  requiredMark?: boolean;
};

export function Input({
  label,
  error,
  requiredMark = false,
  className,
  id,
  type,
  value,
  ...props
}: InputProps) {
  const inputId =
    id ??
    (typeof label === "string"
      ? label.toLowerCase().replace(/\s+/g, "-")
      : "input-field");

  const labelNode = (
    <label
      htmlFor={inputId}
      className="flex items-center gap-0.5 text-sm font-medium text-charcoal-800"
    >
      {label}
      {requiredMark ? (
        <span className="text-rose-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );

  /* Native date inputs on iOS have a large intrinsic min-width that blows
     out mobile layouts. Keep the picker, but size the field from a facade. */
  if (type === "date") {
    const hasValue = typeof value === "string" && value.length > 0;
    const display = hasValue ? formatEventDate(value) : "Select date";

    return (
      <div className="min-w-0 max-w-full space-y-2">
        {labelNode}
        <div
          className={cn(
            "relative w-full max-w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft transition-all focus-within:border-gold-600 focus-within:ring-[3px] focus-within:ring-gold-100",
            error &&
              "border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500/15",
          )}
        >
          <div
            className={cn(
              "pointer-events-none flex items-center justify-between gap-2 px-3 py-2.5 text-sm lg:px-4 lg:py-3.5 lg:text-base",
              hasValue ? "text-charcoal-900" : "text-stone-400",
            )}
          >
            <span className="min-w-0 truncate">{display}</span>
            <Calendar className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
          </div>
          <input
            id={inputId}
            type="date"
            value={value}
            className={cn(
              "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
              className,
            )}
            {...props}
          />
        </div>
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-2">
      {labelNode}
      <input
        id={inputId}
        type={type}
        value={value}
        className={cn(
          "box-border w-full min-w-0 max-w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-charcoal-900 shadow-soft placeholder:text-stone-400 transition-all focus:border-gold-600 focus:outline-none focus:ring-[3px] focus:ring-gold-100 lg:px-4 lg:py-3.5 lg:text-base",
          error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
    </div>
  );
}
