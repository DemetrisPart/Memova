"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Lightbox } from "@/components/guest/lightbox";
import { NameEntryModal } from "@/components/guest/name-entry-modal";
import { SquareThumbFrame } from "@/components/guest/square-thumb-frame";
import {
  checkGuestSession,
  deleteGalleryMedia,
  fetchGallery,
  fetchMediaUrl,
} from "@/lib/api/client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import type { GalleryItem, PrivacyMode, PublicEvent } from "@/lib/api/types";

type GalleryPageClientProps = {
  slug: string;
  event: PublicEvent;
};

function galleryThumbUrl(item: GalleryItem): string | null {
  if (!item.thumbUrl) return null;
  return resolveNetworkUrl({
    url: item.thumbUrl,
    lanUrl: item.thumbUrlLan,
    publicUrl: item.thumbUrlPublic,
  });
}

function galleryHeader(
  privacyMode: PrivacyMode,
  totalCount: number,
): string {
  if (privacyMode === "OWN_UPLOADS_ONLY") {
    return `Your uploads (${totalCount})`;
  }
  return `All guest uploads (${totalCount})`;
}

export function GalleryPageClient({ slug, event }: GalleryPageClientProps) {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(event.privacyMode);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadGallery = useCallback(
    async (cursor?: string) => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await fetchGallery(slug, { cursor, limit: 24 });
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setTotalCount(data.totalCount);
        setPrivacyMode(data.privacyMode);
        setNextCursor(data.nextCursor);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load gallery",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [slug],
  );

  const handleDeleteMedia = useCallback(
    async (mediaId: string) => {
      setDeletingId(mediaId);
      try {
        await deleteGalleryMedia(slug, mediaId);
        setItems((prev) => {
          const next = prev.filter((item) => item.id !== mediaId);
          setLightboxIndex((current) => {
            if (current === null) return null;
            if (next.length === 0) return null;
            return Math.min(current, next.length - 1);
          });
          return next;
        });
        setTotalCount((count) => Math.max(0, count - 1));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not delete photo",
        );
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [slug],
  );

  async function handleGridDelete(
    event: React.MouseEvent,
    item: GalleryItem,
  ) {
    event.stopPropagation();
    if (!item.canDelete || deletingId) return;

    const confirmed = window.confirm(
      "Delete this photo? It will be removed from the gallery.",
    );
    if (!confirmed) return;

    await handleDeleteMedia(item.id);
  }

  useEffect(() => {
    async function verifySession() {
      setCheckingSession(true);
      const hasSession = await checkGuestSession(slug);
      if (!hasSession) {
        setNeedsName(true);
        setCheckingSession(false);
        return;
      }
      setNeedsName(false);
      setSessionReady(true);
      setCheckingSession(false);
      await loadGallery();
    }
    void verifySession();
  }, [loadGallery, slug]);

  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loadingMore) {
          void loadGallery(nextCursor);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadGallery, loadingMore, nextCursor]);

  if (checkingSession) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#c4a574]">
        Loading…
      </div>
    );
  }

  if (needsName) {
    return (
      <NameEntryModal
        slug={slug}
        open
        onClose={() => router.replace(`/${slug}`)}
        onSuccess={async () => {
          const active = await checkGuestSession(slug);
          if (!active) {
            setError(
              "Could not start your session. Refresh and try again, or open in Chrome/Safari.",
            );
            return;
          }
          setNeedsName(false);
          setSessionReady(true);
          setError(null);
          await loadGallery();
        }}
      />
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#c4a574]">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-28">
      <header className="mb-4">
        <Link
          href={`/${slug}`}
          className="text-sm font-medium text-[#c4a574] hover:text-[#d4bb8d]"
        >
          ← Back
        </Link>
      </header>

      <section className="money-lime-zone overflow-hidden px-4 py-4 lg:px-5 lg:py-5">
        <h1 className="text-2xl font-medium text-[#1a1714]">Gallery</h1>
        <p className="mt-1 text-sm font-medium text-[#5c4a32]">
          {galleryHeader(privacyMode, totalCount)}
        </p>

        <div className="mt-4">
          {loading ? (
            <div className="flex min-h-[36vh] items-center justify-center text-[#5c4a32]">
              Loading photos…
            </div>
          ) : error ? (
            <p className="text-center text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : items.length === 0 ? (
            <div className="flex min-h-[36vh] flex-col items-center justify-center gap-4 rounded-2xl bg-[#efe8dc] px-4 py-10 text-center shadow-[0_4px_16px_rgb(0_0_0_/_12%)]">
              <p className="text-[#5c4a32]">No photos yet.</p>
              <Link
                href={`/${slug}/upload`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#c4a574] via-[#a68b4b] to-[#8a6a3f] px-6 text-base font-medium text-white shadow-[inset_1px_1px_0_rgb(255_255_255_/_28%),0_10px_22px_rgb(0_0_0_/_20%)] hover:from-[#b08f5c] hover:via-[#8a7340] hover:to-[#7a5f38]"
              >
                Upload Photos
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#efe8dc] p-2.5 shadow-[0_4px_16px_rgb(0_0_0_/_12%)]">
                {items.map((item, index) => {
                  const thumbUrl = galleryThumbUrl(item);
                  return (
                    <SquareThumbFrame
                      key={item.id}
                      className="rounded-lg bg-[#e4d9cb]"
                    >
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-[#5c4a32]">
                          …
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="absolute inset-0"
                        aria-label="View photo"
                      />
                      {item.canDelete ? (
                        <button
                          type="button"
                          onClick={(event) => void handleGridDelete(event, item)}
                          disabled={deletingId === item.id}
                          className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-[#1a1714]/75 text-white disabled:opacity-50"
                          aria-label="Delete photo"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                      {item.guestLabel ? (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-[#1a1714]/60 px-1 py-0.5 text-[10px] text-white">
                          {item.guestLabel}
                        </span>
                      ) : null}
                    </SquareThumbFrame>
                  );
                })}
              </div>

              <div ref={sentinelRef} className="h-8" />
              {loadingMore ? (
                <p className="py-4 text-center text-sm text-[#5c4a32]">
                  Loading more…
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-[#343434]/92 p-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/${slug}/upload`}
            className="flex min-h-14 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#c4a574] via-[#a68b4b] to-[#8a6a3f] text-base font-medium text-white shadow-[inset_1px_1px_0_rgb(255_255_255_/_28%),0_10px_22px_rgb(0_0_0_/_20%)] hover:from-[#b08f5c] hover:via-[#8a7340] hover:to-[#7a5f38]"
          >
            Upload More
          </Link>
        </div>
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDeleteMedia}
          resolveWebUrl={async (item) => {
            try {
              const result = await fetchMediaUrl(slug, item.id, "web");
              return resolveNetworkUrl({
                url: result.url,
                lanUrl: result.urlLan,
                publicUrl: result.urlPublic,
              });
            } catch {
              return item.thumbUrl;
            }
          }}
        />
      ) : null}
    </div>
  );
}
