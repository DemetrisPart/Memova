import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/dashboard/create-event-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { requireAuth, fetchEventsServer } from "@/lib/api/server-fetch";

export default async function CreateEventPage() {
  const user = await requireAuth();
  const events = await fetchEventsServer();

  if (events.length >= 1 && events[0]?.id) {
    redirect(`/dashboard/events/${events[0].id}`);
  }

  return (
    <div className="min-h-dvh bg-[#343434]">
      <DashboardHeader user={user} onLime />
      <main className="mx-auto max-w-lg px-4 py-8 lg:px-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#c4a574] hover:text-[#d4bb8d]"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#f0e0c4]">
          Create event
        </h1>
        <p className="mt-1 text-sm text-[#c4a574]/80">
          Set up your wedding or celebration page. One event per account.
        </p>
        <div className="money-lime-zone mt-6 overflow-hidden !rounded-2xl p-4 lg:p-5">
          <CreateEventForm />
        </div>
      </main>
    </div>
  );
}
