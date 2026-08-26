import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { requireAuth, fetchEventsServer } from "@/lib/api/server-fetch";
import { formatCoupleNames, formatEventDate } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireAuth();
  const events = await fetchEventsServer();

  if (events.length === 1 && events[0]?.id) {
    redirect(`/dashboard/events/${events[0].id}`);
  }

  return (
    <div className="min-h-dvh bg-ivory-50">
      <DashboardHeader user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-charcoal-900">
              Your events
            </h1>
            <p className="mt-1 text-sm text-stone-400">
              Manage photos and settings for each celebration.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button>New event</Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="panel-3d mt-10 rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-stone-400">No events yet</p>
            <Link href="/dashboard/events/new" className="mt-4 inline-block">
              <Button>Create your first event</Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="panel-3d flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-gold-400/40"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ivory-100">
                    {event.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-charcoal-900">
                      {formatCoupleNames(
                        event.groomName,
                        event.brideName,
                        event.title,
                      )}
                    </p>
                    <p className="text-sm text-stone-400">
                      {formatEventDate(event.eventDate)} · /{event.slug}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
