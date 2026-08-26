import { notFound } from "next/navigation";
import {
  DashboardBottomNav,
  DashboardEventHeader,
  DashboardSidebar,
} from "@/components/dashboard/dashboard-nav";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { requireAuth, fetchEventServer } from "@/lib/api/server-fetch";

type EventLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function EventDashboardLayout({
  children,
  params,
}: EventLayoutProps) {
  const user = await requireAuth();
  const { id } = await params;

  let event;
  try {
    event = await fetchEventServer(id);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-ivory-50">
      <DashboardHeader user={user} />
      <div className="mx-auto flex max-w-6xl">
        <DashboardSidebar event={event} />
        <div className="min-w-0 flex-1 pb-24 lg:pb-8">
          <DashboardEventHeader event={event} />
          <main className="px-3 py-4 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>
      <DashboardBottomNav event={event} />
    </div>
  );
}
