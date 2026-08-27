"use client";

import { cn } from "@/lib/utils";

type EventQrActionsProps = {
  slug: string;
  qrCodePngBase64: string;
  className?: string;
};

function base64ToPngFile(base64: string, fileName: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "image/png" });
  return new File([blob], fileName, { type: "image/png" });
}

function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Avoid Safari's "View / Download" sheet (data: / blob navigation).
 * iPhone: native Share → Save Image only.
 * Desktop: classic file download.
 */
async function downloadQrPng(base64: string, fileName: string): Promise<void> {
  const file = base64ToPngFile(base64, fileName);

  // iOS: share sheet only — never open/view the file in-browser
  if (isAppleTouchDevice() && typeof navigator.share === "function") {
    try {
      const canShareFiles =
        typeof navigator.canShare !== "function" ||
        navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  // Desktop / non-share fallback: force download attribute (no navigation)
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

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
  window.setTimeout(() => {
    window.print();
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
      <button
        type="button"
        onClick={() => void downloadQrPng(qrCodePngBase64, `${slug}-qr.png`)}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#d4b896] via-[#c4a574] to-[#9a7a4a] px-4 text-sm font-medium text-[#1a1714] shadow-float hover:from-[#c4a574] hover:via-[#b08f5c] hover:to-[#8a6a3f] lg:min-h-12 lg:px-6 lg:text-base"
      >
        Download QR PNG
      </button>
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
