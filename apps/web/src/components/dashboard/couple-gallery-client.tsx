"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import JSZip from "jszip";
import { Lightbox } from "@/components/guest/lightbox";
import { SquareThumbFrame } from "@/components/guest/square-thumb-frame";
import {
  deleteCoupleMedia,
  fetchCoupleGallery,
  fetchCoupleMediaUrl,
} from "@/lib/api/dashboard-client";
import { downloadBlob, downloadFromUrl } from "@/lib/download";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import type { CoupleGalleryItem } from "@/lib/api/types";

type CoupleGalleryClientProps = {
  eventId: string;
};

function thumbUrl(item: CoupleGalleryItem): string | null {
  if (!item.thumbUrl) return null;
  return resolveNetworkUrl({
    url: item.thumbUrl,
    lanUrl: item.thumbUrlLan,
    publicUrl: item.thumbUrlPublic,
  });
}

function toLightboxItem(item: CoupleGalleryItem) {
  return {
    id: item.id,
    thumbUrl: thumbUrl(item),
    canDelete: true,
  };
}

async function resolveOriginalDownload(
  eventId: string,
  mediaId: string,
): Promise<{ url: string; fileName: string }> {
  const result = await fetchCoupleMediaUrl(eventId, mediaId, "original");
  return {
    url: resolveNetworkUrl({
      url: result.url,
      lanUrl: result.urlLan,
      publicUrl: result.urlPublic,
    }),
    fileName: result.fileName ?? `photo-${mediaId}.jpg`,
  };
}

export function CoupleGalleryClient({ eventId }: CoupleGalleryClientProps) {
  const [items, setItems] = useState<CoupleGalleryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadGallery = useCallback(
    async (cursor?: string) => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await fetchCoupleGallery(eventId, { cursor, limit: 24 });
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setTotalCount(data.totalCount);
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
    [eventId],
  );

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadGallery(nextCursor);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadGallery]);

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteCoupleMedia(eventId, mediaId);
      setItems((prev) => prev.filter((item) => item.id !== mediaId));
      setTotalCount((c) => Math.max(0, c - 1));
      setLightboxIndex(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const resolveCoupleWebUrl = useCallback(
    async (item: { id: string; thumbUrl: string | null }) => {
      try {
        const result = await fetchCoupleMediaUrl(eventId, item.id, "web");
        return resolveNetworkUrl({
          url: result.url,
          lanUrl: result.urlLan,
          publicUrl: result.urlPublic,
        });
      } catch {
        return item.thumbUrl;
      }
    },
    [eventId],
  );

  const handleDownloadOne = useCallback(
    async (item: { id: string }) => {
      const { url, fileName } = await resolveOriginalDownload(eventId, item.id);
      await downloadFromUrl(url, fileName);
    },
    [eventId],
  );

  const handleSaveAll = async () => {
    if (savingAll || totalCount === 0) return;
    setSavingAll(true);
    setError(null);
    setSaveProgress("Preparing…");

    try {
      const allItems: CoupleGalleryItem[] = [];
      let cursor: string | undefined;
      do {
        const page = await fetchCoupleGallery(eventId, { cursor, limit: 50 });
        allItems.push(...page.items);
        cursor = page.nextCursor ?? undefined;
        setSaveProgress(`Collecting ${allItems.length} of ${page.totalCount}…`);
      } while (cursor);

      if (allItems.length === 0) {
        setSaveProgress(null);
        return;
      }

      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (let i = 0; i < allItems.length; i += 1) {
        const item = allItems[i]!;
        setSaveProgress(`Downloading ${i + 1} of ${allItems.length}…`);
        const { url, fileName } = await resolveOriginalDownload(eventId, item.id);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Could not download photo ${i + 1}`);
        }
        const blob = await response.blob();
        let name = fileName;
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf(".");
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : "";
          name = `${base}-${i + 1}${ext}`;
        }
        usedNames.add(name);
        zip.file(name, blob);
      }

      setSaveProgress("Creating ZIP…");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      await downloadBlob(zipBlob, `gallery-${eventId.slice(0, 8)}.zip`);
      setSaveProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save gallery");
      setSaveProgress(null);
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-stone-400 lg:text-sm">
            {loading ? "Loading…" : `${totalCount} photos`}
          </p>
          {!loading ? (
            <p className="text-xs text-stone-400 lg:text-sm">0 videos</p>
          ) : null}
          {saveProgress ? (
            <p className="truncate text-[11px] text-stone-400">{saveProgress}</p>
          ) : null}
        </div>

        {!loading && totalCount > 0 ? (
          <button
            type="button"
            disabled={savingAll}
            onClick={() => void handleSaveAll()}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gold-700 transition hover:text-gold-600 disabled:opacity-50 lg:text-sm"
          >
            <Download className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {savingAll ? "Saving…" : "Save all"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 lg:px-4 lg:py-3">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-lg bg-stone-200/60"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-6 text-center lg:rounded-2xl lg:p-10">
          <p className="text-sm text-stone-400">No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item, index) => {
            const url = thumbUrl(item);
            return (
              <SquareThumbFrame
                key={item.id}
                className="rounded-lg bg-ivory-100"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-stone-400">
                    …
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="absolute inset-0"
                  aria-label="View photo"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-charcoal-900/60 px-1 py-0.5 text-[10px] text-ivory-50">
                  {item.guestName}
                </span>
              </SquareThumbFrame>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" aria-hidden />
      {loadingMore ? (
        <p className="text-center text-sm text-stone-400">Loading more…</p>
      ) : null}

      {lightboxIndex !== null ? (
        <Lightbox
          items={items.map(toLightboxItem)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          onDownload={handleDownloadOne}
          onIndexChange={setLightboxIndex}
          resolveWebUrl={resolveCoupleWebUrl}
          getTitle={(item) =>
            items.find((entry) => entry.id === item.id)?.guestName ?? ""
          }
          floatingClose
          showNavArrows
        />
      ) : null}
    </div>
  );
}
