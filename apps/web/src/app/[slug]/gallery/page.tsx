import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/guest/gallery-page-client";
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
      title: `Gallery — ${event.title} | Momeva`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Gallery | Momeva", robots: { index: false } };
  }
}

export default async function GalleryPage({ params }: PageProps) {
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
      <GalleryPageClient slug={slug} event={event} />
    </main>
  );
}
