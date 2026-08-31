import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import { requireAuth, fetchEventsServer } from "@/lib/api/server-fetch";

export default async function DashboardPage() {
  const user = await requireAuth();
  const events = await fetchEventsServer();

  // 1 account = 1 event — always open that event (or create the first one).
  if (events.length >= 1 && events[0]?.id) {
    redirect(`/dashboard/events/${events[0].id}`);
  }

  return (
    <div className="min-h-dvh bg-[#343434]">
      <DashboardHeader user={user} onLime />
      <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <div className="money-lime-zone mt-4 overflow-hidden !rounded-2xl p-8 text-center lg:p-10">
          <h1 className="text-2xl font-semibold text-[#1a1714]">
            Create your event
          </h1>
          <p className="mt-2 text-sm text-[#5c4a32]">
            One celebration per account. Guests will upload photos to this page.
          </p>
          <Link href="/dashboard/events/new" className="mt-6 inline-block">
            <Button className="border-0 !bg-gradient-to-br !from-[#c4a574] !via-[#a68b4b] !to-[#8a6a3f] !text-white">
              Get started
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
