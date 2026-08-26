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
          className="surface-3d flex items-start gap-2.5 p-3.5 lg:gap-3 lg:p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d8cec2] text-[#5c4a32] lg:h-11 lg:w-11">
            <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
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
