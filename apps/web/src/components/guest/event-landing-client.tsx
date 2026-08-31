"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NameEntryModal } from "@/components/guest/name-entry-modal";
import { LandingAlbum } from "@/components/guest/designs/landing-album";
import { LandingBento } from "@/components/guest/designs/landing-bento";
import { LandingEditorial } from "@/components/guest/designs/landing-editorial";
import { LandingGarden } from "@/components/guest/designs/landing-garden";
import { LandingLetter } from "@/components/guest/designs/landing-letter";
import { LandingLuxury } from "@/components/guest/designs/landing-luxury";
import { LandingNeon } from "@/components/guest/designs/landing-neon";
import { LandingOriginal } from "@/components/guest/designs/landing-original";
import { LandingSplit } from "@/components/guest/designs/landing-split";
import { LandingStories } from "@/components/guest/designs/landing-stories";
import { LandingTicket } from "@/components/guest/designs/landing-ticket";
import { LandingWallet } from "@/components/guest/designs/landing-wallet";
import { checkGuestSession } from "@/lib/api/client";
import { useGuestTheme } from "@/lib/themes/theme-provider";
import type { GuestThemeId } from "@/lib/themes/types";
import type { PublicEvent } from "@/lib/api/types";

type EventLandingClientProps = {
  slug: string;
  event: PublicEvent;
};

export function EventLandingClient({ slug, event }: EventLandingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useGuestTheme();
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"upload" | "gallery" | null>(null);
  const [navigating, setNavigating] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      return await checkGuestSession(slug);
    } catch {
      return false;
    }
  }, [slug]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "upload" && action !== "gallery") return;

    void refreshSession().then((active) => {
      if (active) {
        router.replace(`/${slug}/${action}`);
        return;
      }
      setPendingAction(action);
      setNameModalOpen(true);
    });
  }, [refreshSession, router, searchParams, slug]);

  async function navigateWithSession(action: "upload" | "gallery") {
    if (navigating || nameModalOpen) return;
    setNavigating(true);
    try {
      const active = await refreshSession();
      if (active) {
        router.push(`/${slug}/${action}`);
        return;
      }
      setPendingAction(action);
      setNameModalOpen(true);
    } finally {
      setNavigating(false);
    }
  }

  function handleNameSuccess() {
    setNameModalOpen(false);
    if (pendingAction === "upload") router.push(`/${slug}/upload`);
    else if (pendingAction === "gallery") router.push(`/${slug}/gallery`);
    setPendingAction(null);
  }

  function handleModalClose() {
    setNameModalOpen(false);
    setPendingAction(null);
    if (searchParams.get("action")) router.replace(`/${slug}`);
  }

  const designProps = {
    slug,
    event,
    onUpload: () => void navigateWithSession("upload"),
    onGallery: () => void navigateWithSession("gallery"),
  };

  let content;
  switch (theme as GuestThemeId) {
    case "garden":
      content = <LandingGarden {...designProps} />;
      break;
    case "ticket":
      content = <LandingTicket {...designProps} />;
      break;
    case "stories":
      content = <LandingStories {...designProps} />;
      break;
    case "wallet":
      content = <LandingWallet {...designProps} />;
      break;
    case "bento":
      content = <LandingBento {...designProps} />;
      break;
    case "letter":
      content = <LandingLetter {...designProps} />;
      break;
    case "neon":
      content = <LandingNeon {...designProps} />;
      break;
    case "split":
      content = <LandingSplit {...designProps} />;
      break;
    case "luxury":
      content = <LandingLuxury {...designProps} />;
      break;
    case "album":
      content = <LandingAlbum {...designProps} />;
      break;
    case "editorial":
      content = <LandingEditorial {...designProps} />;
      break;
    default:
      content = <LandingOriginal {...designProps} />;
  }

  return (
    <>
      {content}
      <NameEntryModal
        slug={slug}
        open={nameModalOpen}
        onClose={handleModalClose}
        onSuccess={handleNameSuccess}
      />
    </>
  );
}
