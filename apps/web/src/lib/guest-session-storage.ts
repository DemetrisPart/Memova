const KEY_PREFIX = "momeva_guest_session:";

/** Dev / Mobile Preview fallback when HttpOnly cookies are blocked in iframes. */
export function setGuestSessionToken(slug: string, token: string): void {
  sessionStorage.setItem(`${KEY_PREFIX}${slug}`, token);
}

export function getGuestSessionToken(slug: string): string | null {
  return sessionStorage.getItem(`${KEY_PREFIX}${slug}`);
}

export function clearGuestSessionToken(slug: string): void {
  sessionStorage.removeItem(`${KEY_PREFIX}${slug}`);
}
