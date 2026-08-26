"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Images, QrCode, Settings } from "lucide-react";
import { cn, formatCoupleNames } from "@/lib/utils";
import type { CoupleEvent } from "@/lib/api/types";

type DashboardBottomNavProps = {
  event: CoupleEvent;
};

const tabs = [
  { href: "", label: "Home", icon: Home, suffix: "" },
  { href: "/gallery", label: "Gallery", icon: Images, suffix: "gallery" },
  { href: "/qr", label: "QR", icon: QrCode, suffix: "qr" },
  { href: "/settings", label: "Settings", icon: Settings, suffix: "settings" },
] as const;

export function DashboardBottomNav({ event }: DashboardBottomNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/events/${event.id}`;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] print-hide print:hidden lg:hidden"
      aria-label="Event dashboard"
    >
      <div className="pointer-events-auto flex w-full max-w-xs items-center justify-between gap-1 rounded-full bg-gradient-to-br from-[#d4b896] via-[#c4a574] to-[#9a7a4a] px-1.5 py-1.5 shadow-float ring-1 ring-[#6b5535]/25 sm:max-w-sm sm:px-2 sm:py-2">
        {tabs.map(({ href, label, icon: Icon, suffix }) => {
          const path = `${base}${href}`;
          const active =
            suffix === ""
              ? pathname === base
              : pathname.startsWith(`${base}/${suffix}`);
          return (
            <Link
              key={label}
              href={path}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-full transition-colors sm:h-12",
                active
                  ? "bg-[#2e2a24]/35 text-[#1a1714]"
                  : "text-[#3d3933] hover:text-[#1a1714]",
              )}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={active ? 2.25 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashboardEventHeader({
  event,
  onLime = false,
}: {
  event: CoupleEvent;
  onLime?: boolean;
}) {
  return (
    <header
      className={
        onLime
          ? "px-3 py-2.5 lg:px-8 lg:py-3"
          : "border-b border-white/5 bg-[#1c1c1c]/80 px-3 py-2.5 backdrop-blur-md lg:px-8 lg:py-3"
      }
    >
      <h1
        className={
          onLime
            ? "text-sm font-semibold text-[#181818] lg:text-lg"
            : "text-sm font-semibold text-white lg:text-lg"
        }
      >
        {formatCoupleNames(event.groomName, event.brideName, event.title)}
      </h1>
    </header>
  );
}

export function DashboardSidebar({ event }: { event: CoupleEvent }) {
  const pathname = usePathname();
  const base = `/dashboard/events/${event.id}`;

  return (
    <aside className="hidden w-60 shrink-0 border-r border-white/5 bg-[#1c1c1c]/70 print:hidden lg:block">
      <div className="sticky top-0 px-4 py-6">
        <Link
          href="/dashboard"
          className="text-xs font-medium text-stone-400 hover:text-charcoal-800"
        >
          ← All events
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-stone-400">
          Event
        </p>
        <p className="mt-1 font-semibold text-charcoal-900">
          {formatCoupleNames(event.groomName, event.brideName, event.title)}
        </p>
        <nav className="mt-6 space-y-1" aria-label="Event sections">
          {tabs.map(({ href, label, icon: Icon, suffix }) => {
            const path = `${base}${href}`;
            const active =
              suffix === ""
                ? pathname === base
                : pathname.startsWith(`${base}/${suffix}`);
            return (
              <Link
                key={label}
                href={path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-gold-100 text-gold-700"
                    : "text-charcoal-800 hover:bg-ivory-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
