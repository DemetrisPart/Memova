import { CoupleGalleryClient } from "@/components/dashboard/couple-gallery-client";

type GalleryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventGalleryPage({ params }: GalleryPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-3 text-base font-semibold text-charcoal-900 lg:mb-4 lg:text-lg">
        Gallery
      </h2>
      <CoupleGalleryClient eventId={id} />
    </div>
  );
}
