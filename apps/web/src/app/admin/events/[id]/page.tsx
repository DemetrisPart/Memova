import { AdminEventDetailClient } from "@/components/admin/admin-event-detail-client";

type AdminEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventPage({ params }: AdminEventPageProps) {
  const { id } = await params;
  return <AdminEventDetailClient eventId={id} />;
}
