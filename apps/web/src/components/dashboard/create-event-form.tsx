"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkSlugAvailability,
  createEvent,
} from "@/lib/api/dashboard-client";
import { ApiError } from "@/lib/api/types";
import { buildSuggestedEventSlug, slugify } from "@/lib/utils";

export function CreateEventForm() {
  const router = useRouter();
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slugTouched) return;
    const auto = buildSuggestedEventSlug(groomName, brideName, eventDate);
    if (auto.length >= 3) setSlug(auto);
    else setSlug("");
  }, [groomName, brideName, eventDate, slugTouched]);

  useEffect(() => {
    if (slug.length < 3) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    const timer = window.setTimeout(() => {
      void checkSlugAvailability(slug)
        .then((result) => {
          if (!result.available) {
            setSlugStatus(result.error ? "invalid" : "taken");
          } else {
            setSlugStatus("available");
          }
        })
        .catch(() => setSlugStatus("invalid"));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus !== "available") return;
    setLoading(true);
    setError(null);
    try {
      const event = await createEvent({
        groomName: groomName.trim(),
        brideName: brideName.trim(),
        eventDate,
        slug: slug.trim(),
      });
      router.push(`/dashboard/events/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="panel-3d space-y-5 rounded-2xl p-6"
    >
      <Input
        label="Groom / partner name"
        required
        value={groomName}
        onChange={(e) => setGroomName(e.target.value)}
      />
      <Input
        label="Bride / partner name"
        required
        value={brideName}
        onChange={(e) => setBrideName(e.target.value)}
      />
      <Input
        label="Event date"
        type="date"
        required
        value={eventDate}
        onChange={(e) => setEventDate(e.target.value)}
      />
      <div>
        <Input
          label="Event URL"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="demetris-daniella-3-oct-2026"
        />
        <p className="mt-1 text-xs text-stone-400">
          momeva.com/{slug || "your-event"}
          {slugStatus === "checking" ? " — checking…" : null}
          {slugStatus === "available" ? " — available ✓" : null}
          {slugStatus === "taken" ? " — already taken" : null}
          {slugStatus === "invalid" ? " — invalid URL" : null}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          Includes the exact event date so the live link matches the celebration
          day.
        </p>
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      <Button
        type="submit"
        fullWidth
        disabled={loading || slugStatus !== "available"}
      >
        {loading ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
