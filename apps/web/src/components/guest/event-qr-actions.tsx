"use client";

import { cn } from "@/lib/utils";

type EventQrActionsProps = {
  slug: string;
  qrCodePngBase64: string;
  className?: string;
};

function printQrCardOnly() {
  const card = document.querySelector<HTMLElement>(".design-qr-card");
  if (!card) {
    window.print();
    return;
  }

  const existing = document.getElementById("qr-print-root");
  existing?.remove();

  const root = document.createElement("div");
  root.id = "qr-print-root";
  root.setAttribute("aria-hidden", "true");
  const clone = card.cloneNode(true) as HTMLElement;
  // Hide action buttons if somehow present on clone
  clone.querySelectorAll(".print\\:hidden, .print-hide").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });
  root.appendChild(clone);
  document.body.appendChild(root);
  document.body.classList.add("qr-printing");

  const cleanup = () => {
    document.body.classList.remove("qr-printing");
    root.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  // Safari sometimes needs a tick before print
  window.setTimeout(() => {
    window.print();
    // Fallback cleanup if afterprint never fires (some mobile browsers)
    window.setTimeout(cleanup, 1500);
  }, 50);
}

export function EventQrActions({
  slug,
  qrCodePngBase64,
  className,
}: EventQrActionsProps) {
  return (
    <div className={cn("space-y-2.5 print:hidden print-hide lg:space-y-3", className)}>
      <a
        href={`data:image/png;base64,${qrCodePngBase64}`}
        download={`${slug}-qr.png`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gold-600 px-4 text-sm font-medium text-ivory-50 hover:bg-gold-700 lg:min-h-12 lg:px-6 lg:text-base"
      >
        Download QR PNG
      </a>
      <button
        type="button"
        onClick={printQrCardOnly}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-charcoal-800/15 bg-ivory-100 px-4 text-sm font-medium text-charcoal-900 hover:bg-ivory-50 lg:min-h-12 lg:px-6 lg:text-base"
      >
        Print
      </button>
    </div>
  );
}
