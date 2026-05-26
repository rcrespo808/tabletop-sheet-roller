export const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function getPublicAssetPath(path: string): string {
  if (!publicBasePath || !path.startsWith("/")) {
    return path;
  }

  return `${publicBasePath}${path}`;
}
