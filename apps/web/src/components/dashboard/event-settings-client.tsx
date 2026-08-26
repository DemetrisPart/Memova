"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoupleNamesHeading } from "@/components/guest/couple-names-heading";
import {
  completeCoverUpload,
  initCoverUpload,
  updateEvent,
} from "@/lib/api/dashboard-client";
import { uploadFileToPresignedUrl } from "@/lib/api/client";
import { resolveNetworkUrl } from "@/lib/mobile-network";
import {
  formatEventDate,
  formatCoupleNames,
  inferPhotoContentType,
} from "@/lib/utils";
import type { CoupleEvent } from "@/lib/api/types";

type EventSettingsClientProps = {
  event: CoupleEvent;
};

function resolveCoverSrc(event: CoupleEvent): string | null {
  if (!event.coverImageUrl) return null;
  return resolveNetworkUrl({
    url: event.coverImageUrl,
    lanUrl: event.coverImageUrlLan,
    publicUrl: event.coverImageUrlPublic,
  });
}

export function EventSettingsClient({ event }: EventSettingsClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groomName, setGroomName] = useState(event.groomName);
  const [brideName, setBrideName] = useState(event.brideName);
  const [eventDate, setEventDate] = useState(event.eventDate);
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(() =>
    resolveCoverSrc(event),
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setCoverSrc(resolveCoverSrc(event));
  }, [
    event.coverImageUrl,
    event.coverImageUrlLan,
    event.coverImageUrlPublic,
  ]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const previewSrc = localPreviewUrl ?? coverSrc;
  const previewGroom = groomName.trim() || event.groomName;
  const previewBride = brideName.trim() || event.brideName;
  const previewDate = eventDate || event.eventDate;

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateEvent(event.id, { groomName, brideName, eventDate });
      setMessage("Event details saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onCoverSelect = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    setCoverUploading(true);
    setError(null);
    setMessage(null);
    try {
      const contentType = inferPhotoContentType(file);
      const init = await initCoverUpload(event.id, {
        contentType,
        contentLength: file.size,
        fileName: file.name,
      });
      const uploadUrl = resolveNetworkUrl({
        url: init.uploadUrl,
        lanUrl: init.uploadUrlLan,
        publicUrl: init.uploadUrlPublic,
      });
      await uploadFileToPresignedUrl(file, uploadUrl);
      const updated = await completeCoverUpload(event.id, init.mediaId);
      const remoteSrc = resolveCoverSrc(updated);
      if (!remoteSrc) {
        throw new Error("Cover saved but image URL is missing");
      }

      // Keep the local blob visible until the remote URL actually loads.
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error("Cover uploaded but could not be loaded from storage"));
        img.src = remoteSrc;
      });

      setCoverSrc(remoteSrc);
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setMessage("Cover photo updated");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-4 lg:space-y-8">
      <section className="w-full max-w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-soft lg:rounded-2xl lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-charcoal-900">
              Cover photo
            </h2>
            <p className="mt-0.5 text-[11px] text-stone-400 lg:text-xs">
              Preview of how guests see your landing page
            </p>
          </div>
          <div className="shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onCoverSelect(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={coverUploading}
              onClick={() => fileRef.current?.click()}
            >
              {coverUploading ? "Uploading…" : previewSrc ? "Change" : "Add cover"}
            </Button>
          </div>
        </div>

        <div className="relative mt-3 aspect-[4/5] w-full overflow-hidden rounded-xl bg-ivory-100 sm:aspect-[3/4] lg:mt-4">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
              onError={() => {
                // Fall back through URL variants if the active src fails.
                if (localPreviewUrl && previewSrc !== localPreviewUrl) {
                  return;
                }
                const fallback = resolveCoverSrc(event);
                if (fallback && fallback !== previewSrc) {
                  setCoverSrc(fallback);
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d4c4a8_0%,_#f9f5ee_55%)]" />
          )}

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgb(26 23 20 / 8%) 0%, transparent 30%, transparent 45%, rgb(253 251 247 / 0.5) 65%, rgb(253 251 247 / 0.9) 80%, #fdfbf7 94%)",
            }}
          />

          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16">
            <div className="mx-auto max-w-sm text-center">
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-gold-600">
                Celebration
              </p>
              <CoupleNamesHeading
                groomName={previewGroom}
                brideName={previewBride}
                fallback={formatCoupleNames(
                  previewGroom,
                  previewBride,
                  event.title,
                )}
                className="font-couple mt-1 text-[1.75rem] leading-[1.05] text-charcoal-900 sm:text-[2rem]"
              />
              <div className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/75 px-3 py-1 text-[11px] text-stone-400 backdrop-blur-sm">
                <CalendarDays className="size-3 text-gold-600" aria-hidden />
                <span>{formatEventDate(previewDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {!previewSrc ? (
          <p className="mt-2 text-center text-[11px] text-stone-400">
            No cover yet — add a photo to see the guest preview
          </p>
        ) : null}
      </section>

      <form
        onSubmit={saveDetails}
        className="w-full max-w-full space-y-4 overflow-hidden rounded-xl border border-stone-200 bg-white p-3 shadow-soft lg:space-y-5 lg:rounded-2xl lg:p-5"
      >
        <h2 className="text-sm font-semibold text-charcoal-900">Event details</h2>

        <Input
          label="Groom / partner name"
          value={groomName}
          onChange={(e) => setGroomName(e.target.value)}
          required
        />
        <Input
          label="Bride / partner name"
          value={brideName}
          onChange={(e) => setBrideName(e.target.value)}
          required
        />
        <Input
          label="Event date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
        />

        <Input
          label="Event URL"
          value={`/${event.slug}`}
          readOnly
          className="text-stone-400"
        />
        <p className="text-[11px] text-stone-400 lg:text-xs">
          Locked after creation so printed QR codes keep working. New events
          include the exact date in the URL (e.g. /demetris-daniella-3-oct-2026).
        </p>

        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        {message ? (
          <p className="text-sm text-emerald-700">{message}</p>
        ) : null}

        <Button type="submit" fullWidth disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
