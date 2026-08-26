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
    <div className="design-qr-card design-qr-original p-5 text-center lg:p-8 print:p-8">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gold-600 lg:text-[11px]">
        Share your memories with us
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
      <p className="mt-3 break-all text-xs text-stone-400 lg:mt-4 lg:text-sm print:text-xs print:text-charcoal-800">
        {qr.eventUrl}
      </p>
      <div className="mt-4 space-y-2.5 print:hidden lg:mt-6 lg:space-y-3">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-charcoal-800/15 bg-white px-4 text-sm font-medium text-charcoal-900 hover:bg-ivory-50 lg:min-h-12 lg:px-6 lg:text-base"
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
