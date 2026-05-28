export const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
