"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { logout } from "@/lib/api/dashboard-client";
import { saveRememberedEmail } from "@/lib/auth/remembered-email";
import type { AuthUser } from "@/lib/api/types";

type DashboardHeaderProps = {
  user: AuthUser;
  /** Gold overview chrome — sticky Momeva bar */
  onLime?: boolean;
};

export function DashboardHeader({ user, onLime = false }: DashboardHeaderProps) {
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
    <header
      className={
        onLime
          ? "sticky top-0 z-50 w-full bg-[#343434]/95 backdrop-blur-md print-hide print:hidden"
          : "sticky top-0 z-50 mx-3 mt-3 rounded-b-[1.75rem] rounded-t-2xl border border-[#f7ecd4]/50 bg-gradient-to-br from-[#fff8ec] via-[#e8d5b0] to-[#c4a574] px-3 py-2.5 shadow-float print-hide print:hidden lg:mx-8 lg:px-8 lg:py-3"
      }
    >
      <div
        className={
          onLime
            ? "mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-3 py-2 lg:px-8 lg:py-2.5"
            : "mx-auto flex max-w-6xl items-center justify-between gap-4"
        }
      >
        <p
          className={
            onLime
              ? "bg-gradient-to-br from-[#f0e0c4] via-[#d4b896] to-[#b08f5c] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              : "text-lg font-semibold tracking-tight text-[#181818] lg:text-2xl"
          }
        >
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181818]/90 text-[#f0f0f0] transition hover:bg-[#181818] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181818]"
            title="Account"
          >
            <Menu className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#222222] p-2 shadow-float"
            >
              <p className="truncate px-3 py-2 text-left text-sm text-white/80">
                {user.email}
              </p>
              {user.role === "PLATFORM_ADMIN" ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    router.push("/admin");
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-sky-300 hover:bg-white/5 hover:text-sky-200"
                >
                  Platform admin
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#9a9a9a] hover:bg-white/5 hover:text-white"
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
