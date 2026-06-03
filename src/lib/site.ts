/** Canonical production origin (Vercel production alias). */
export const productionSiteOrigin = "https://tabletop-sheet-roller.vercel.app";

export const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function originFromVercelHost(host: string | undefined): string | undefined {
  if (!host) return undefined;
  const trimmed = stripTrailingSlash(host.replace(/^https?:\/\//, ""));
  return trimmed ? `https://${trimmed}` : undefined;
}

/** Resolved public site origin for auth redirects and links. */
export function resolveSiteOrigin(browserOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return stripTrailingSlash(configured);

  const vercelProduction = originFromVercelHost(
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim()
  );
  if (vercelProduction) return vercelProduction;

  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercelHost && process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    const fromPreviewHost = originFromVercelHost(vercelHost);
    if (fromPreviewHost) return fromPreviewHost;
  }

  const fallback = browserOrigin ? stripTrailingSlash(browserOrigin) : "";
  const isLocal =
    fallback.includes("localhost") || fallback.includes("127.0.0.1");

  if (isLocal && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return productionSiteOrigin;
  }

  return fallback || productionSiteOrigin;
}

export function getPublicAssetPath(path: string): string {
  if (!publicBasePath || !path.startsWith("/")) {
    return path;
  }

  return `${publicBasePath}${path}`;
}

export function resolveImageUrl(path?: string | null): string {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  return getPublicAssetPath(path);
}
