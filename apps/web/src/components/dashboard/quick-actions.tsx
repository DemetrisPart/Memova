"use client";

import Link from "next/link";
import { Images, QrCode, Settings } from "lucide-react";

type QuickActionsProps = {
  eventId: string;
};

const actions = [
  {
    href: "gallery",
    label: "Gallery",
    description: "View all photos and videos",
    icon: Images,
  },
  {
    href: "qr",
    label: "QR & share",
    description: "Print or download",
    icon: QrCode,
  },
  {
    href: "settings",
    label: "Settings",
    description: "Edit event details",
    icon: Settings,
  },
] as const;

export function QuickActions({ eventId }: QuickActionsProps) {
  const base = `/dashboard/events/${eventId}`;

  return (
    <div className="grid gap-2.5 sm:grid-cols-3 lg:gap-3">
      {actions.map(({ href, label, description, icon: Icon }) => (
        <Link
          key={href}
          href={`${base}/${href}`}
          className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-white p-3 shadow-soft transition-colors hover:border-gold-400/40 hover:bg-ivory-50 lg:gap-3 lg:rounded-2xl lg:p-4"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700 lg:h-10 lg:w-10 lg:rounded-xl">
            <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-charcoal-900">
              {label}
            </span>
            <span className="mt-0.5 block text-[11px] text-stone-400 lg:text-xs">
              {description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
