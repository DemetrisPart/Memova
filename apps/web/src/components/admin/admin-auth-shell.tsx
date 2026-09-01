import type { ReactNode } from "react";

/** Shared charcoal + brand chrome for admin auth (distinct from couple gold kartella). */
export function AdminAuthShell({
  children,
  eyebrow = "Platform admin",
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[#343434]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% -8%, rgb(56 189 248 / 18%), transparent 55%),
            radial-gradient(ellipse 45% 35% at 100% 85%, rgb(14 165 233 / 12%), transparent 50%),
            radial-gradient(ellipse 40% 30% at 0% 70%, rgb(196 165 116 / 10%), transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400">
          {eyebrow}
        </p>
        <h1 className="mt-3 bg-gradient-to-br from-[#f0e0c4] via-[#d4b896] to-[#b08f5c] bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          Momeva
        </h1>

        <div className="mt-8 w-full max-w-sm rounded-2xl border border-sky-500/25 bg-[#1c1c1c]/90 p-6 text-left shadow-[0_20px_50px_rgb(0_0_0_/_35%)] ring-1 ring-white/5 backdrop-blur-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
