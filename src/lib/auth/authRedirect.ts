import { AUTH_CONFIRM_PATH } from "@/lib/auth/authPaths";
import { publicBasePath, resolveSiteOrigin } from "@/lib/site";

export { AUTH_CONFIRM_PATH } from "@/lib/auth/authPaths";

/** Full URL Supabase should redirect to after email confirmation. */
export function getAuthConfirmUrl(browserOrigin?: string): string {
  const base = resolveSiteOrigin(browserOrigin);
  const path = `${publicBasePath}${AUTH_CONFIRM_PATH}` || AUTH_CONFIRM_PATH;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
