import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UploadPageClient } from "@/components/guest/upload-page-client";
import { fetchPublicEvent } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const event = await fetchPublicEvent(slug);
    return {
      title: `Upload Photos — ${event.title} | Momeva`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Upload | Momeva", robots: { index: false } };
  }
}

export default async function UploadPage({ params }: PageProps) {
  const { slug } = await params;

  let event;
  try {
    event = await fetchPublicEvent(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="min-h-dvh bg-[#343434]">
      <UploadPageClient slug={slug} event={event} />
    </main>
  );
}
