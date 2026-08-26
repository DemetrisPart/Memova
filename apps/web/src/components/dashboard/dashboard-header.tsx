"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { logout } from "@/lib/api/dashboard-client";
import { saveRememberedEmail } from "@/lib/auth/remembered-email";
import type { AuthUser } from "@/lib/api/types";

type DashboardHeaderProps = {
  user: AuthUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user.email) saveRememberedEmail(user.email);
  }, [user.email]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    if (user.email) saveRememberedEmail(user.email);
    setOpen(false);
    try {
      await logout();
    } finally {
      router.push("/auth/login");
      router.refresh();
    }
  };

  return (
    <header className="border-b border-stone-200 bg-white px-3 py-2.5 lg:px-8 lg:py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="text-lg font-semibold tracking-tight text-charcoal-900 lg:text-2xl">
          Momeva
        </p>

        <div ref={rootRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label="Account menu"
            onClick={() => setOpen((value) => !value)}
            className="flex items-center justify-center p-1.5 text-gold-600 transition hover:text-gold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600"
            title="Account"
          >
            <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-soft"
            >
              <p className="truncate px-3 py-2 text-left text-sm text-charcoal-800">
                {user.email}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-500 hover:bg-ivory-50 hover:text-charcoal-900"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
