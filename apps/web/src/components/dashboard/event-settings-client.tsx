"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Image as ImageIcon,
  Link2,
  Shield,
} from "lucide-react";
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
  galleryVisibilityNoteLines,
  inferPhotoContentType,
  cn,
} from "@/lib/utils";
import type { CoupleEvent, PrivacyMode } from "@/lib/api/types";

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

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

/** Warm panel like Recent uploads, gold rim like Overview kartella */
function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.85rem] bg-gradient-to-br from-[#f7ecd4] via-[#c4a574] to-[#9a7a4a] p-[1.5px] shadow-[0_8px_24px_rgb(0_0_0_/_20%)]">
      <div className="panel-3d overflow-hidden !rounded-[calc(1.85rem-1.5px)]">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  value,
  chevron,
  children,
  last,
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  value?: string;
  chevron?: boolean;
  children?: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3.5 py-3",
        !last && "border-b border-stone-200",
      )}
    >
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5c4a32]">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-charcoal-900">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-stone-400">
            {description}
          </p>
        ) : null}
      </div>
      {value ? (
        <span className="shrink-0 text-xs text-stone-400">{value}</span>
      ) : null}
      {children}
      {chevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      ) : null}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? "bg-emerald-500" : "bg-[#cfc4b4]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-[#1a1714] shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function EventSettingsClient({ event }: EventSettingsClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groomName, setGroomName] = useState(event.groomName);
  const [brideName, setBrideName] = useState(event.brideName);
  const [eventDate, setEventDate] = useState(event.eventDate);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(event.privacyMode);
  const [showGuestNamesPublicly, setShowGuestNamesPublicly] = useState(
    event.showGuestNamesPublicly,
  );
  const [notifyExpiry3d, setNotifyExpiry3d] = useState(
    event.notifyExpiry3d ?? true,
  );
  const [notifyFirstGuestPhoto, setNotifyFirstGuestPhoto] = useState(
    event.notifyFirstGuestPhoto ?? false,
  );
  const [notifyStorageNearFull, setNotifyStorageNearFull] = useState(
    event.notifyStorageNearFull ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(() =>
    resolveCoverSrc(event),
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(true);

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
      await updateEvent(event.id, {
        groomName,
        brideName,
        eventDate,
        privacyMode,
        showGuestNamesPublicly,
        notifyExpiry3d,
        notifyFirstGuestPhoto,
        notifyStorageNearFull,
      });
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

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const timeoutId = window.setTimeout(() => {
          resolve();
        }, 8_000);
        img.onload = () => {
          window.clearTimeout(timeoutId);
          resolve();
        };
        img.onerror = () => {
          window.clearTimeout(timeoutId);
          reject(
            new Error("Cover uploaded but could not be loaded from storage"),
          );
        };
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

  const privacyValue =
    privacyMode === "ALL_GUESTS" ? "Shared gallery" : "Own uploads only";

  return (
    <form
      onSubmit={saveDetails}
      className="mx-auto w-full min-w-0 max-w-lg space-y-5 lg:space-y-6"
    >
      <SettingsSection title="Cover">
        <SettingsCard>
          <div className="flex items-start justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-charcoal-900">Cover photo</p>
              <p className="mt-0.5 text-xs text-stone-400">
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
                {coverUploading
                  ? "Uploading…"
                  : previewSrc
                    ? "Change"
                    : "Add cover"}
              </Button>
            </div>
          </div>

          <div className="border-t border-stone-200 px-3.5 pb-3.5 pt-3">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-white sm:aspect-[3/4]">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
                  onError={() => {
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
                  <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#a68b4b]">
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
                    className="font-couple mt-1 text-[1.75rem] leading-[1.05] text-[#1a1714] sm:text-[2rem]"
                  />
                  <div className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full border border-[#e8e2d9]/80 bg-[rgb(255_255_255_/_0.75)] px-3 py-1 text-[11px] text-[#a89f91] backdrop-blur-sm">
                    <CalendarDays
                      className="size-3 text-[#a68b4b]"
                      aria-hidden
                    />
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
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Event details">
        <SettingsCard>
          <div className="space-y-3 px-3.5 py-3.5">
            <Input
              label="Groom / partner name"
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              className="!border-[#d4cabd] !bg-[#efe8dc] shadow-none"
              required
            />
            <Input
              label="Bride / partner name"
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              className="!border-[#d4cabd] !bg-[#efe8dc] shadow-none"
              required
            />
            <Input
              label="Event date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="!border-[#d4cabd] !bg-[#efe8dc] shadow-none"
              required
            />
          </div>
          <SettingsRow
            icon={<Link2 className="h-4 w-4" aria-hidden />}
            label="Event URL"
            value={`/${event.slug}`}
            last
          />
          <p className="border-t border-stone-200 px-3.5 py-2.5 text-[11px] leading-relaxed text-stone-400">
            <span className="font-medium text-charcoal-900">Note</span>
            {
              " : The URL and QR code is automatically generated based on the event date and cannot be modified."
            }
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsCard>
          <button
            type="button"
            onClick={() => setPrivacyOpen((open) => !open)}
            className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5c4a32]">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal-900">
                Privacy &amp; Security
              </p>
              <p className="mt-0.5 text-xs text-stone-400">{privacyValue}</p>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                privacyOpen && "rotate-90",
              )}
              aria-hidden
            />
          </button>

          {privacyOpen ? (
            <div className="border-t border-stone-200">
              <p className="px-3.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                Gallery privacy
              </p>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-3.5 py-3",
                  privacyMode === "OWN_UPLOADS_ONLY" && "bg-[#d8cec2]/55",
                )}
              >
                <input
                  type="radio"
                  name="privacyMode"
                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                  checked={privacyMode === "OWN_UPLOADS_ONLY"}
                  onChange={() => setPrivacyMode("OWN_UPLOADS_ONLY")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-charcoal-900">
                    Own uploads only
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-400">
                    Guests only see photos they uploaded.
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 border-t border-stone-200 px-3.5 py-3",
                  privacyMode === "ALL_GUESTS" && "bg-[#d8cec2]/55",
                )}
              >
                <input
                  type="radio"
                  name="privacyMode"
                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                  checked={privacyMode === "ALL_GUESTS"}
                  onChange={() => {
                    if (privacyMode === "ALL_GUESTS") return;
                    const ok = window.confirm(
                      "Shared gallery lets every guest see everyone’s uploads. Continue?",
                    );
                    if (ok) setPrivacyMode("ALL_GUESTS");
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-charcoal-900">
                    Shared gallery
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-stone-400">
                    Guests can see everyone’s uploads.
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-3 border-t border-stone-200 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal-900">
                    Show guest names on photos
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-400">
                    Display who uploaded each photo in the guest gallery.
                  </p>
                </div>
                <ToggleSwitch
                  checked={showGuestNamesPublicly}
                  onChange={setShowGuestNamesPublicly}
                  label="Show guest names on photos"
                />
              </div>
            </div>
          ) : null}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsCard>
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5c4a32]">
              <Bell className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal-900">
                Notifications by email
              </p>
              <p className="mt-0.5 text-xs text-stone-400">
                Timed emails send once scheduling is enabled.
              </p>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                notificationsOpen && "rotate-90",
              )}
              aria-hidden
            />
          </button>

          {notificationsOpen ? (
            <div className="border-t border-stone-200">
              <SettingsRow
                label="3 days before account expires"
                description="Reminder to download your pictures before they’re deleted from Momeva."
              >
                <ToggleSwitch
                  checked={notifyExpiry3d}
                  onChange={setNotifyExpiry3d}
                  label="Notify 3 days before account expires"
                />
              </SettingsRow>
              <SettingsRow
                label="First guest photo"
                description="Get an email when the first guest photo arrives."
              >
                <ToggleSwitch
                  checked={notifyFirstGuestPhoto}
                  onChange={setNotifyFirstGuestPhoto}
                  label="First guest photo"
                />
              </SettingsRow>
              <SettingsRow
                label="Storage nearly full (80%+)"
                description="Alert when your gallery is almost out of space."
                last
              >
                <ToggleSwitch
                  checked={notifyStorageNearFull}
                  onChange={setNotifyStorageNearFull}
                  label="Storage nearly full"
                />
              </SettingsRow>
            </div>
          ) : null}
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Photo visibility">
        <SettingsCard>
          <SettingsRow
            icon={<ImageIcon className="h-4 w-4" aria-hidden />}
            label="How long photos stay in Momeva"
            last
          />
          <div className="space-y-0.5 border-t border-stone-200 px-3.5 py-3 text-xs leading-relaxed text-rose-600">
            {galleryVisibilityNoteLines(event.galleryVisibleDays ?? 14).map(
              (line) => (
                <p key={line}>{line}</p>
              ),
            )}
          </div>
        </SettingsCard>
      </SettingsSection>

      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-400">{message}</p>
      ) : null}

      <Button type="submit" fullWidth disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
