"use client";

import { useEffect, useState } from "react";
import {
  ensureMobileNetworkRoute,
  hasCachedNetworkProbe,
  isMobileNetworkConfigured,
} from "@/lib/mobile-network";

export function MobileNetworkBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(() => {
    if (!isMobileNetworkConfigured()) return true;
    return hasCachedNetworkProbe();
  });

  useEffect(() => {
    if (!isMobileNetworkConfigured()) return;
    // Already probed this tab — skip overlay + work.
    if (hasCachedNetworkProbe()) {
      setReady(true);
      return;
    }

    void (async () => {
      await ensureMobileNetworkRoute();
      setReady(true);
    })();
  }, []);

  return (
    <>
      {children}
      {!ready ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ivory-50/90 text-stone-400"
          aria-live="polite"
        >
          Connecting…
        </div>
      ) : null}
    </>
  );
}
