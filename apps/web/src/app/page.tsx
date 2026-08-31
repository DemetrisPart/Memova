import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[#343434]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 80% 55% at 50% -10%, rgb(196 165 116 / 28%), transparent 58%),
            radial-gradient(ellipse 50% 40% at 100% 80%, rgb(176 143 92 / 16%), transparent 55%),
            radial-gradient(ellipse 45% 35% at 0% 70%, rgb(201 168 122 / 12%), transparent 50%)
          `,
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <h1 className="animate-[home-fade-up_0.8s_ease-out_0.06s_both] bg-gradient-to-br from-[#f0e0c4] via-[#d4b896] to-[#b08f5c] bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          Momeva
        </h1>
        <p className="animate-[home-fade-up_0.8s_ease-out_0.12s_both] mt-4 max-w-sm bg-gradient-to-br from-[#f0e0c4] via-[#d4b896] to-[#b08f5c] bg-clip-text text-base leading-relaxed text-transparent">
          Memories from everyone who celebrated with you.
        </p>

        <div className="money-lime-zone animate-[home-fade-up_0.85s_ease-out_0.2s_both] mt-10 w-full max-w-xs overflow-hidden px-3 py-3 sm:max-w-sm sm:px-3.5 sm:py-3.5">
          <div className="flex flex-col gap-2.5">
            <Link href="/auth/login" className="block w-full">
              <Button
                fullWidth
                className="min-h-11 border-0 !bg-gradient-to-br !from-[#c4a574] !via-[#a68b4b] !to-[#8a6a3f] !text-white shadow-[inset_1px_1px_0_rgb(255_255_255_/_28%),0_10px_22px_rgb(0_0_0_/_20%)] hover:!from-[#b08f5c] hover:!via-[#8a7340] hover:!to-[#7a5f38] lg:min-h-12"
              >
                Couple sign in
              </Button>
            </Link>
            <Link href="/auth/login?mode=register" className="block w-full">
              <Button
                variant="secondary"
                fullWidth
                className="min-h-11 !border-0 bg-white text-charcoal-900 shadow-[0_4px_16px_rgb(0_0_0_/_14%)] hover:bg-ivory-100 lg:min-h-12"
              >
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
