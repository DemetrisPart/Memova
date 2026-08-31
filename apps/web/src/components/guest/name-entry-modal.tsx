"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGuestSession } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";

type NameEntryModalProps = {
  slug: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (name: { firstName: string; lastName: string | null }) => void;
};

export function NameEntryModal({
  slug,
  open,
  onClose,
  onSuccess,
}: NameEntryModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      setError("First name is required");
      return;
    }

    setLoading(true);
    try {
      await createGuestSession(slug, {
        firstName: trimmedFirst,
        lastName: lastName.trim() || undefined,
      });
      onSuccess({
        firstName: trimmedFirst,
        lastName: lastName.trim() || null,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#1a1714]/55 p-4 pt-10 backdrop-blur-sm sm:items-start sm:pt-16"
      onClick={handleClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-entry-title"
        className="money-lime-zone relative w-full max-w-md overflow-hidden !rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-[#5c4a32] transition-colors hover:bg-[#efe8dc]/70 hover:text-[#1a1714] disabled:opacity-50"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        <div className="relative px-6 pb-6 pt-8">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#efe8dc] shadow-[0_4px_16px_rgb(0_0_0_/_12%)]">
            <Sparkles className="size-5 text-[#8a6a3f]" aria-hidden />
          </div>

          <h2
            id="name-entry-title"
            className="font-serif text-2xl leading-tight text-[#1a1714]"
          >
            Welcome! What&apos;s your name?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5c4a32]">
            So the couple knows who shared these memories.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label={
                <span className="text-[#1a1714]">First name</span>
              }
              requiredMark
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              autoFocus
              disabled={loading}
              placeholder="Maria"
              className="!border-0 !bg-[#efe8dc] !text-[#1a1714] shadow-[0_4px_16px_rgb(0_0_0_/_12%)] placeholder:!text-[#8a7a68]"
            />
            <Input
              label={
                <span className="text-[#1a1714]">Last name (optional)</span>
              }
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              disabled={loading}
              placeholder="Papadopoulou"
              className="!border-0 !bg-[#efe8dc] !text-[#1a1714] shadow-[0_4px_16px_rgb(0_0_0_/_12%)] placeholder:!text-[#8a7a68]"
            />

            {error ? (
              <div
                className="rounded-xl border border-rose-500/25 bg-[#efe8dc]/90 px-4 py-3 text-sm text-rose-600"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <p className="text-xs leading-relaxed text-[#5c4a32]">
              Your name is stored for this event only.
            </p>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 flex-1 !border-0 bg-white text-charcoal-900 shadow-[0_4px_16px_rgb(0_0_0_/_14%)] hover:bg-ivory-100"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="min-h-12 flex-1 border-0 !bg-gradient-to-br !from-[#c4a574] !via-[#a68b4b] !to-[#8a6a3f] !text-white shadow-[inset_1px_1px_0_rgb(255_255_255_/_28%),0_10px_22px_rgb(0_0_0_/_20%)] hover:!from-[#b08f5c] hover:!via-[#8a7340] hover:!to-[#7a5f38]"
                disabled={loading}
              >
                {loading ? "Saving…" : "Continue"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
