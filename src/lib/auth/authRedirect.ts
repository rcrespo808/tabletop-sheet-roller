import { publicBasePath } from "@/lib/site";

export const AUTH_CONFIRM_PATH = "/auth/confirm";

/** Production site origin from env (no trailing slash). */
export function getConfiguredSiteOrigin(): string | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return undefined;
  return siteUrl.replace(/\/$/, "");
}

/**
 * App origin for auth redirects: configured production URL first, then browser origin.
 */
export function getAppOrigin(fallbackOrigin?: string): string | undefined {
  const configured = getConfiguredSiteOrigin();
  if (configured) return configured;

  if (fallbackOrigin) {
    return fallbackOrigin.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return undefined;
}

/** Full URL Supabase should redirect to after email confirmation. */
export function getAuthConfirmUrl(origin?: string): string | undefined {
  const base = getAppOrigin(origin);
  if (!base) return undefined;

  const path = `${publicBasePath}${AUTH_CONFIRM_PATH}` || AUTH_CONFIRM_PATH;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
