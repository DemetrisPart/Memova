"use client";

import { usePathname } from "next/navigation";
import {
  DashboardBottomNav,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import type { AuthUser, CoupleEvent } from "@/lib/api/types";

type EventDashboardShellProps = {
  user: AuthUser;
  event: CoupleEvent;
  children: React.ReactNode;
};

export function EventDashboardShell({
  user,
  event,
  children,
}: EventDashboardShellProps) {
  const pathname = usePathname();
  const base = `/dashboard/events/${event.id}`;
  const isOverview = pathname === base;

  return (
    <div className="min-h-dvh bg-[#343434]">
      {isOverview ? (
        <>
          <div className="mx-auto flex max-w-6xl">
            <DashboardSidebar event={event} />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          <DashboardBottomNav event={event} />
        </>
      ) : (
        <>
          <DashboardHeader user={user} onLime />
          <div className="mx-auto flex max-w-6xl">
            <DashboardSidebar event={event} />
            <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
          </div>
          <DashboardBottomNav event={event} />
        </>
      )}
    </div>
  );
}
