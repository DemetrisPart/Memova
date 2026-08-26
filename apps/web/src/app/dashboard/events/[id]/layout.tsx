import { notFound } from "next/navigation";
import { EventDashboardShell } from "@/components/dashboard/event-dashboard-shell";
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
    <EventDashboardShell user={user} event={event}>
      {children}
    </EventDashboardShell>
  );
}
