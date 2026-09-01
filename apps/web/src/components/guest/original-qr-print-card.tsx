"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { CoupleNamesHeading } from "@/components/guest/couple-names-heading";
import { EventQrActions } from "@/components/guest/event-qr-actions";
import type { PublicEventQr } from "@/lib/api/types";
import { copyTextToClipboard, formatEventDateDots } from "@/lib/utils";

type OriginalQrPrintCardProps = {
  qr: PublicEventQr;
};

export function OriginalQrPrintCard({ qr }: OriginalQrPrintCardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const date = formatEventDateDots(qr.eventDate);

  const copyLink = async () => {
    const ok = await copyTextToClipboard(qr.eventUrl);
    if (ok) {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
      return;
    }

    // No visible URL on the card (Phase 4) — select hidden text as last resort.
    const urlEl = document.getElementById("guest-event-url");
    if (urlEl && window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(urlEl);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setCopyState("failed");
    window.setTimeout(() => setCopyState("idle"), 3500);
  };

  return (
    <div className="design-qr-card design-qr-original p-5 text-center lg:p-8 print:p-8">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold-600 lg:text-[11px]">
        Scan to share photos
      </p>
      <CoupleNamesHeading
        groomName={qr.groomName}
        brideName={qr.brideName}
        fallback={qr.title}
        className="font-couple mt-2 text-[32px] leading-[1.02] text-charcoal-900 lg:mt-3 lg:text-[46px] print:mt-3 print:text-[46px]"
      />
      <p className="mt-1.5 text-sm text-stone-400 lg:mt-2 lg:text-base">{date}</p>
      <div className="design-qr-frame mx-auto mt-5 inline-block lg:mt-8 print:mt-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${qr.qrCodePngBase64}`}
          alt={`QR code for ${qr.title}`}
          width={256}
          height={256}
          className="size-48 lg:size-64 print:size-64"
        />
      </div>
      {/* Clipboard fallback only — never shown on screen or print. */}
      <span id="guest-event-url" className="sr-only print:hidden print-hide">
        {qr.eventUrl}
      </span>
      <div className="mt-4 space-y-2.5 print:hidden print-hide lg:mt-6 lg:space-y-3">
        <button
          type="button"
          onClick={() => void copyLink()}
          className={
            copyState === "copied"
              ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#2f6b4f]/35 bg-[#2f6b4f]/15 px-4 text-sm font-medium text-[#1f5c3d] lg:min-h-12 lg:px-6 lg:text-base"
              : copyState === "failed"
                ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-medium text-rose-600 lg:min-h-12 lg:px-6 lg:text-base"
                : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-charcoal-800/15 bg-white px-4 text-sm font-medium text-charcoal-900 hover:bg-ivory-50 lg:min-h-12 lg:px-6 lg:text-base"
          }
        >
          {copyState === "copied" ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copied!
            </>
          ) : copyState === "failed" ? (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Could not copy — try again
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy guest link
            </>
          )}
        </button>
        <EventQrActions slug={qr.slug} qrCodePngBase64={qr.qrCodePngBase64} />
      </div>
    </div>
  );
}
