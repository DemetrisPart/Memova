import { AdminEventsListClient } from "@/components/admin/admin-events-list-client";
import { AdminHealthMonitor } from "@/components/admin/admin-health-monitor";

export default function AdminPage() {
  return (
    <>
      <AdminHealthMonitor />
      <AdminEventsListClient />
    </>
  );
}
