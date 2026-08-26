"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { CoupleNamesHeading } from "@/components/guest/couple-names-heading";
import { EventQrActions } from "@/components/guest/event-qr-actions";
import type { PublicEventQr } from "@/lib/api/types";
import { formatEventDate } from "@/lib/utils";

type OriginalQrPrintCardProps = {
  qr: PublicEventQr;
};

export function OriginalQrPrintCard({ qr }: OriginalQrPrintCardProps) {
  const [copied, setCopied] = useState(false);
  const date = formatEventDate(qr.eventDate);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qr.eventUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", qr.eventUrl);
    }
  };

  return (
    <div className="design-qr-card design-qr-original p-8 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-600">
        Share your memories with us
      </p>
      <CoupleNamesHeading
        groomName={qr.groomName}
        brideName={qr.brideName}
        fallback={qr.title}
        className="font-couple mt-3 text-[39px] leading-[1.02] text-charcoal-900 sm:text-[46px]"
      />
      <p className="mt-2 text-base text-stone-400">{date}</p>
      <div className="design-qr-frame mx-auto mt-8 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${qr.qrCodePngBase64}`}
          alt={`QR code for ${qr.title}`}
          width={256}
          height={256}
          className="size-64"
        />
      </div>
      <p className="mt-4 break-all text-sm text-stone-400 print:text-xs print:text-charcoal-800">
        {qr.eventUrl}
      </p>
      <div className="mt-6 space-y-3 print:hidden">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-charcoal-800/15 bg-white px-6 text-base font-medium text-charcoal-900 hover:bg-ivory-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy guest link
            </>
          )}
        </button>
        <EventQrActions slug={qr.slug} qrCodePngBase64={qr.qrCodePngBase64} />
      </div>
    </div>
  );
}
