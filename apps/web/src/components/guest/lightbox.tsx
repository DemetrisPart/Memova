"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LightboxItem = {
  id: string;
  thumbUrl: string | null;
  canDelete?: boolean;
};

type LightboxProps = {
  items: LightboxItem[];
  initialIndex: number;
  onClose: () => void;
  resolveWebUrl: (item: LightboxItem) => Promise<string | null>;
  onDelete?: (mediaId: string) => Promise<void>;
  onDownload?: (item: LightboxItem) => Promise<void>;
  onIndexChange?: (index: number) => void;
  getTitle?: (item: LightboxItem) => string;
  floatingClose?: boolean;
  showNavArrows?: boolean;
};

const SNAP_MS = 165;
const SNAP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function preloadImage(url: string | null): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function Lightbox({
  items,
  initialIndex,
  onClose,
  resolveWebUrl,
  onDelete,
  onDownload,
  onIndexChange,
  getTitle,
  floatingClose = false,
  showNavArrows = false,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [urlsById, setUrlsById] = useState<Record<string, string>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [lockedUrl, setLockedUrl] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const swipeAreaRef = useRef<HTMLDivElement>(null);

  const widthRef = useRef(0);
  const dragXRef = useRef(0);
  const draggingRef = useRef(false);
  const settlingRef = useRef(false);
  const startXRef = useRef(0);
  const velocityRef = useRef(0);
  const lastSampleRef = useRef({ x: 0, t: 0 });
  const indexRef = useRef(index);
  const itemsRef = useRef(items);
  const urlsByIdRef = useRef(urlsById);
  const loadGenRef = useRef(0);
  const resolveWebUrlRef = useRef(resolveWebUrl);

  const current = items[index];
  const canDelete = Boolean(current?.canDelete && onDelete);
  const canDownload = Boolean(onDownload);
  const canSwipe = items.length > 1;

  indexRef.current = index;
  itemsRef.current = items;
  urlsByIdRef.current = urlsById;
  resolveWebUrlRef.current = resolveWebUrl;

  const urlForItem = useCallback(
    (item: LightboxItem | undefined) => {
      if (!item) return null;
      return urlsById[item.id] ?? item.thumbUrl;
    },
    [urlsById],
  );

  const displayUrl = lockedUrl ?? urlForItem(current);

  const setIndexAndNotify = useCallback(
    (nextIndex: number) => {
      setIndex(nextIndex);
      onIndexChange?.(nextIndex);
    },
    [onIndexChange],
  );

  const applyTransform = useCallback((dx: number, animate: boolean) => {
    const layer = currentRef.current;
    if (!layer) return;

    layer.style.transition = animate
      ? `transform ${SNAP_MS}ms ${SNAP_EASE}`
      : "none";
    layer.style.transform = `translate3d(${dx}px, 0, 0)`;
  }, []);

  const cacheUrls = useCallback((entries: Record<string, string | null>) => {
    const valid = Object.entries(entries).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    );
    if (valid.length === 0) return;

    setUrlsById((prev) => {
      const next = { ...prev };
      for (const [id, url] of valid) {
        next[id] = url;
      }
      urlsByIdRef.current = next;
      return next;
    });
  }, []);

  const prefetchAround = useCallback(async (atIndex: number, gen: number) => {
    const list = itemsRef.current;
    const centerItem = list[atIndex];
    const prevItem = list[atIndex - 1];
    const nextItem = list[atIndex + 1];
    const resolve = resolveWebUrlRef.current;

    const [centerResolved, prevResolved, nextResolved] = await Promise.all([
      centerItem ? resolve(centerItem) : Promise.resolve(null),
      prevItem ? resolve(prevItem) : Promise.resolve(null),
      nextItem ? resolve(nextItem) : Promise.resolve(null),
    ]);

    if (gen !== loadGenRef.current) return;

    cacheUrls({
      ...(centerItem ? { [centerItem.id]: centerResolved } : {}),
      ...(prevItem ? { [prevItem.id]: prevResolved } : {}),
      ...(nextItem ? { [nextItem.id]: nextResolved } : {}),
    });

    await Promise.all([
      preloadImage(centerResolved),
      preloadImage(prevResolved),
      preloadImage(nextResolved),
    ]);
  }, [cacheUrls]);

  useEffect(() => {
    setLockedUrl(null);
    setIndex(initialIndex);

    const gen = ++loadGenRef.current;
    setInitialLoading(true);

    void (async () => {
      await prefetchAround(initialIndex, gen);
      if (gen !== loadGenRef.current) return;
      setInitialLoading(false);
    })();
  }, [initialIndex, prefetchAround]);

  useEffect(() => {
    if (items.length === 0) {
      onClose();
      return;
    }
    setIndex((i) => Math.min(i, items.length - 1));
  }, [items.length, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      const w = viewport.clientWidth;
      if (w <= 0) return;
      widthRef.current = w;
      if (!draggingRef.current && !settlingRef.current) {
        applyTransform(dragXRef.current, false);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [applyTransform]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (settlingRef.current || draggingRef.current || deleting) return;
      const clamped = Math.max(
        0,
        Math.min(itemsRef.current.length - 1, nextIndex),
      );
      if (clamped === indexRef.current) return;

      setIndexAndNotify(clamped);
      dragXRef.current = 0;
      applyTransform(0, false);
      void prefetchAround(clamped, loadGenRef.current);
    },
    [applyTransform, deleting, prefetchAround, setIndexAndNotify],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && indexRef.current > 0) {
        goTo(indexRef.current - 1);
      }
      if (
        event.key === "ArrowRight" &&
        indexRef.current < itemsRef.current.length - 1
      ) {
        goTo(indexRef.current + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, onClose]);

  function applyEdgeResistance(delta: number): number {
    const idx = indexRef.current;
    if (idx === 0 && delta > 0) return delta * 0.18;
    if (idx === itemsRef.current.length - 1 && delta < 0) {
      return delta * 0.18;
    }
    return delta;
  }

  function beginDrag(clientX: number) {
    if (!canSwipe || deleting || !displayUrl || settlingRef.current) return;

    draggingRef.current = true;
    setDragging(true);
    startXRef.current = clientX;
    lastSampleRef.current = { x: clientX, t: performance.now() };
    velocityRef.current = 0;
    applyTransform(dragXRef.current, false);
  }

  function moveDrag(clientX: number) {
    if (!draggingRef.current) return;

    const now = performance.now();
    const elapsed = now - lastSampleRef.current.t;
    if (elapsed > 0) {
      velocityRef.current = (clientX - lastSampleRef.current.x) / elapsed;
    }
    lastSampleRef.current = { x: clientX, t: now };

    const delta = applyEdgeResistance(clientX - startXRef.current);
    dragXRef.current = delta;
    applyTransform(delta, false);
  }

  function finishDrag() {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    setDragging(false);

    const dx = dragXRef.current;
    const w = widthRef.current || 1;
    const v = velocityRef.current;
    const idx = indexRef.current;
    const list = itemsRef.current;
    const nextItem = list[idx + 1];
    const prevItem = list[idx - 1];
    const nextUrl = urlForItem(nextItem);
    const prevUrl = urlForItem(prevItem);
    const currentUrl = urlForItem(list[idx]);

    const commitNext =
      (dx < -w * 0.14 || v < -0.55) && idx < list.length - 1 && nextUrl;
    const commitPrev =
      (dx > w * 0.14 || v > 0.55) && idx > 0 && prevUrl;

    const settle = (targetDx: number, nextIndex: number) => {
      if (!currentUrl) return;

      settlingRef.current = true;
      setSettling(true);
      setLockedUrl(currentUrl);
      applyTransform(targetDx, true);

      const layer = currentRef.current;
      if (!layer) {
        settlingRef.current = false;
        setSettling(false);
        setLockedUrl(null);
        return;
      }

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        layer.removeEventListener("transitionend", onTransitionEnd);

        layer.style.transition = "none";
        setIndexAndNotify(nextIndex);
        setLockedUrl(null);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            layer.style.transform = "translate3d(0, 0, 0)";
            dragXRef.current = 0;
            settlingRef.current = false;
            setSettling(false);
            void prefetchAround(nextIndex, loadGenRef.current);
          });
        });
      };

      const onTransitionEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "transform") return;
        finish();
      };

      layer.addEventListener("transitionend", onTransitionEnd);
      window.setTimeout(finish, SNAP_MS + 80);
    };

    if (commitNext) {
      settle(-w, idx + 1);
      return;
    }

    if (commitPrev) {
      settle(w, idx - 1);
      return;
    }

    applyTransform(0, true);
    dragXRef.current = 0;
  }

  async function handleDelete() {
    if (!current || !onDelete || deleting) return;

    const confirmed = window.confirm(
      "Delete this photo? It will be removed from the gallery.",
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await onDelete(current.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownload() {
    if (!current || !onDownload || downloading) return;
    setDownloading(true);
    try {
      await onDownload(current);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  const headerTitle = current && getTitle ? getTitle(current) : null;

  const actionButtons = (
    <div className="flex items-center gap-1">
      {canDownload ? (
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading || initialLoading}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 disabled:opacity-50"
          aria-label="Download photo"
        >
          <Download className="h-5 w-5" />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 disabled:opacity-50"
          aria-label="Delete photo"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {floatingClose ? (
        <button
          type="button"
          onClick={onClose}
          className="fixed z-[60] flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-sm hover:bg-black/90 active:scale-95"
          style={{
            top: "max(1rem, env(safe-area-inset-top))",
            right: "max(1rem, env(safe-area-inset-right))",
          }}
          aria-label="Close photo"
        >
          <X className="size-6" strokeWidth={2.5} />
        </button>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 text-white",
          floatingClose &&
            "pb-2 pt-[max(1rem,env(safe-area-inset-top))] pr-16",
        )}
      >
        {headerTitle ? (
          <p className="truncate text-sm font-medium text-white">{headerTitle}</p>
        ) : (
          <span className="text-sm font-medium text-white">
            {index + 1} / {items.length}
          </span>
        )}

        {!floatingClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/10"
            aria-label="Close lightbox"
          >
            <X className="size-6 text-white" strokeWidth={2.5} />
          </button>
        ) : canDownload || canDelete ? (
          actionButtons
        ) : (
          <span className="w-9" aria-hidden />
        )}
      </div>

      <div
        ref={swipeAreaRef}
        className="relative flex flex-1 touch-none select-none items-center justify-center px-4"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          swipeAreaRef.current?.setPointerCapture(e.pointerId);
          beginDrag(e.clientX);
        }}
        onPointerMove={(e) => moveDrag(e.clientX)}
        onPointerUp={() => finishDrag()}
        onPointerCancel={() => finishDrag()}
      >
        {showNavArrows ? (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0 || initialLoading}
            className="absolute left-2 z-10 rounded-full bg-white/10 px-3 py-2 text-lg text-white disabled:opacity-30"
            aria-label="Previous photo"
          >
            ‹
          </button>
        ) : null}

        <div
          ref={viewportRef}
          className="relative h-full max-h-[75dvh] w-full max-w-3xl overflow-hidden"
        >
          <div
            ref={currentRef}
            className="absolute inset-0 will-change-transform"
          >
            {initialLoading && !displayUrl ? (
              <div className="flex h-full min-h-[40vh] items-center justify-center text-ivory-50">
                {deleting ? "Deleting…" : "Loading…"}
              </div>
            ) : displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current?.id ?? "slide"}
                src={displayUrl}
                alt=""
                className="pointer-events-none size-full object-contain select-none"
                draggable={false}
              />
            ) : null}
          </div>
        </div>

        {showNavArrows ? (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index >= items.length - 1 || initialLoading}
            className="absolute right-2 z-10 rounded-full bg-white/10 px-3 py-2 text-lg text-white disabled:opacity-30"
            aria-label="Next photo"
          >
            ›
          </button>
        ) : null}
      </div>

      {headerTitle ? (
        <p className="pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs text-white/50">
          {index + 1} / {items.length}
        </p>
      ) : null}

      {(canDelete || canDownload) && !floatingClose ? (
        <div className="flex justify-center gap-3 border-t border-white/10 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {canDownload ? (
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading || initialLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 text-base font-medium text-white hover:bg-white/25 disabled:opacity-50"
            >
              <Download className="size-5 shrink-0" aria-hidden />
              {downloading ? "Downloading…" : "Download"}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-base font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <Trash2 className="size-5 shrink-0" aria-hidden />
              {deleting ? "Deleting…" : "Delete photo"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
