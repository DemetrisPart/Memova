"use client";

import { cn } from "@/lib/utils";

type EventQrActionsProps = {
  slug: string;
  qrCodePngBase64: string;
  className?: string;
};

export function EventQrActions({
  slug,
  qrCodePngBase64,
  className,
}: EventQrActionsProps) {
  return (
    <div className={cn("space-y-2.5 print:hidden lg:space-y-3", className)}>
      <a
        href={`data:image/png;base64,${qrCodePngBase64}`}
        download={`${slug}-qr.png`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gold-600 px-4 text-sm font-medium text-ivory-50 hover:bg-gold-700 lg:min-h-12 lg:px-6 lg:text-base"
      >
        Download QR PNG
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-charcoal-800/15 bg-ivory-100 px-4 text-sm font-medium text-charcoal-900 hover:bg-ivory-50 lg:min-h-12 lg:px-6 lg:text-base"
      >
        Print
      </button>
    </div>
  );
}
