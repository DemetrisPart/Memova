export type NetworkMode = "lan" | "public";

const MODE_KEY = "momeva_network_mode";

type UrlSet = {
  url: string;
  lanUrl?: string | null;
  publicUrl?: string | null;
};

export function getMobileOrigins(): {
  lan: string | undefined;
  publicOrigin: string | undefined;
} {
  return {
    lan: process.env.NEXT_PUBLIC_MOBILE_LAN_ORIGIN,
    publicOrigin: process.env.NEXT_PUBLIC_MOBILE_PUBLIC_ORIGIN,
  };
}

export function isMobileNetworkConfigured(): boolean {
  const { lan, publicOrigin } = getMobileOrigins();
  return Boolean(lan || publicOrigin);
}

export function getNetworkMode(): NetworkMode | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(MODE_KEY);
  return value === "lan" || value === "public" ? value : null;
}

export function setNetworkMode(mode: NetworkMode): void {
  sessionStorage.setItem(MODE_KEY, mode);
}

async function probeOrigin(origin: string, timeoutMs = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${origin}/api/network-probe`, {
      signal: controller.signal,
      cache: "no-store",
      mode: "cors",
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

function modeForOrigin(
  origin: string,
  lan?: string,
  publicOrigin?: string,
): NetworkMode {
  if (publicOrigin && origin === publicOrigin) return "public";
  return "lan";
}

export async function detectBestNetworkMode(): Promise<NetworkMode> {
  const { lan, publicOrigin } = getMobileOrigins();

  if (lan && publicOrigin) {
    const [lanOk, publicOk] = await Promise.all([
      probeOrigin(lan),
      probeOrigin(publicOrigin),
    ]);
    if (lanOk && publicOk) return "lan";
    if (lanOk) return "lan";
    if (publicOk) return "public";
    return "public";
  }

  if (lan) {
    return (await probeOrigin(lan)) ? "lan" : "public";
  }

  if (publicOrigin) {
    return (await probeOrigin(publicOrigin)) ? "public" : "lan";
  }

  return "public";
}

export function resolveNetworkUrl(urls: UrlSet): string {
  const mode = getNetworkMode();

  if (mode === "lan" && urls.lanUrl) return urls.lanUrl;
  if (mode === "public" && urls.publicUrl) return urls.publicUrl;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return urls.url;
    }

    // Phone / Mobile Preview on a LAN IP must not use localhost MinIO.
    if (isPrivateHostname(host)) {
      return urls.lanUrl || urls.publicUrl || urls.url;
    }
  }

  if (urls.lanUrl && !urls.publicUrl) return urls.lanUrl;
  if (urls.publicUrl && !urls.lanUrl) return urls.publicUrl;
  return urls.lanUrl || urls.publicUrl || urls.url;
}

function isPrivateHostname(host: string): boolean {
  if (host.startsWith("192.168.") || host.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

export function getRedirectTarget(
  mode: NetworkMode,
  pathname: string,
): string | null {
  if (typeof window === "undefined") return null;

  const { lan, publicOrigin } = getMobileOrigins();
  const targetOrigin = mode === "lan" ? lan : publicOrigin;
  if (!targetOrigin) return null;

  const currentOrigin = window.location.origin;
  if (currentOrigin === targetOrigin) return null;

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${targetOrigin}${path}${window.location.search}`;
}

const PROBE_DONE_KEY = "momeva_network_probe_done";

export function hasCachedNetworkProbe(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PROBE_DONE_KEY) === "1";
}

export function markNetworkProbeDone(): void {
  sessionStorage.setItem(PROBE_DONE_KEY, "1");
}

/** Keep the current origin when it already works — avoids guest → home redirects on LAN. */
export async function ensureMobileNetworkRoute(): Promise<NetworkMode | null> {
  if (!isMobileNetworkConfigured()) return null;

  const { lan, publicOrigin } = getMobileOrigins();
  const currentOrigin = window.location.origin;
  const hostname = window.location.hostname;
  const currentPath =
    window.location.pathname + window.location.search + window.location.hash;

  // Already on a private LAN host — stay. Stale NEXT_PUBLIC_MOBILE_LAN_ORIGIN
  // (old Wi‑Fi IP) must not redirect guests mid-session.
  if (isPrivateHostname(hostname)) {
    setNetworkMode("lan");
    markNetworkProbeDone();
    return "lan";
  }

  if (await probeOrigin(currentOrigin)) {
    const mode = modeForOrigin(currentOrigin, lan, publicOrigin);
    setNetworkMode(mode);
    markNetworkProbeDone();
    return mode;
  }

  const mode = await detectBestNetworkMode();
  setNetworkMode(mode);

  const target = getRedirectTarget(mode, currentPath);
  if (target && isUsableRedirectTarget(target)) {
    window.location.replace(target);
    return mode;
  }

  markNetworkProbeDone();
  return mode;
}

function isUsableRedirectTarget(target: string): boolean {
  try {
    const host = new URL(target).hostname;
    if (host.includes("x.x.x") || host === "example.com") return false;
    return true;
  } catch {
    return false;
  }
}
