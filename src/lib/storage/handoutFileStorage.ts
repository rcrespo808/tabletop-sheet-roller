import { getSupabaseClient, isSupabaseConfigured } from "@/lib/storage/supabaseClient";

export const HANDOUT_IMAGES_BUCKET = "handout-images";
export const HANDOUT_ATTACHMENTS_BUCKET = "handout-attachments";
export const MAX_HANDOUT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_HANDOUT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/json",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp"
]);
const ATTACHMENT_EXTENSIONS = new Set(["pdf", "txt", "md", "png", "jpg", "jpeg", "webp", "json"]);

type BucketName = typeof HANDOUT_IMAGES_BUCKET | typeof HANDOUT_ATTACHMENTS_BUCKET;

function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
}

function sanitizeFilename(value: string): string {
  const [name, ...rest] = value.trim().split(".");
  const extension = rest.pop();
  const safeName = sanitizeSegment(name || "file").toLowerCase();
  const safeExtension = extension ? sanitizeSegment(extension).toLowerCase() : "";
  return safeExtension ? `${safeName}.${safeExtension}` : safeName;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extensionFromName(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function imageExtension(file: File): string {
  const extension = extensionFromName(file.name);
  if (extension === "jpeg") return "jpg";
  if (IMAGE_EXTENSIONS.has(extension)) return extension;
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

function qualifiedPath(bucket: BucketName, objectPath: string): string {
  return `${bucket}/${objectPath}`;
}

function parseQualifiedPath(path: string): { bucket: BucketName; objectPath: string } | null {
  if (path.startsWith(`${HANDOUT_IMAGES_BUCKET}/`)) {
    return { bucket: HANDOUT_IMAGES_BUCKET, objectPath: path.slice(HANDOUT_IMAGES_BUCKET.length + 1) };
  }
  if (path.startsWith(`${HANDOUT_ATTACHMENTS_BUCKET}/`)) {
    return {
      bucket: HANDOUT_ATTACHMENTS_BUCKET,
      objectPath: path.slice(HANDOUT_ATTACHMENTS_BUCKET.length + 1)
    };
  }
  return null;
}

function validateImageFile(file: File): void {
  const extension = extensionFromName(file.name);
  if (!IMAGE_MIME_TYPES.has(file.type) || !IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("Use PNG, JPEG, WebP, or GIF images.");
  }
  if (file.size > MAX_HANDOUT_IMAGE_BYTES) {
    throw new Error("Handout images must be 5MB or smaller.");
  }
}

function validateAttachmentFile(file: File): void {
  const extension = extensionFromName(file.name);
  const hasAllowedMime =
    ATTACHMENT_MIME_TYPES.has(file.type) ||
    file.type === "" ||
    file.type === "application/octet-stream";
  if (!hasAllowedMime || !ATTACHMENT_EXTENSIONS.has(extension)) {
    throw new Error("Use PDF, TXT, MD, PNG, JPEG, WebP, or JSON attachments.");
  }
  if (file.size > MAX_HANDOUT_ATTACHMENT_BYTES) {
    throw new Error("Handout attachments must be 10MB or smaller.");
  }
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function uploadToBucket(
  bucket: BucketName,
  objectPath: string,
  file: File
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase client unavailable.");

  const { error } = await client.storage.from(bucket).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
    cacheControl: "3600"
  });

  if (error) throw error;
  return qualifiedPath(bucket, objectPath);
}

export async function uploadHandoutImage(
  file: File,
  gameTableId: string,
  handoutId: string
): Promise<string> {
  validateImageFile(file);
  if (!gameTableId || !handoutId) throw new Error("Save the handout before uploading files.");

  if (!isSupabaseConfigured() || !isUuid(gameTableId) || !isUuid(handoutId)) {
    return readFileAsDataUrl(file);
  }

  const extension = imageExtension(file);
  const objectPath = `${sanitizeSegment(gameTableId)}/${sanitizeSegment(handoutId)}/image-${Date.now()}.${extension}`;
  return uploadToBucket(HANDOUT_IMAGES_BUCKET, objectPath, file);
}

export async function uploadHandoutAttachment(
  file: File,
  gameTableId: string,
  handoutId: string
): Promise<string> {
  validateAttachmentFile(file);
  if (!gameTableId || !handoutId) throw new Error("Save the handout before uploading files.");

  if (!isSupabaseConfigured() || !isUuid(gameTableId) || !isUuid(handoutId)) {
    return readFileAsDataUrl(file);
  }

  const objectPath = `${sanitizeSegment(gameTableId)}/${sanitizeSegment(handoutId)}/attachments/${Date.now()}-${sanitizeFilename(file.name)}`;
  return uploadToBucket(HANDOUT_ATTACHMENTS_BUCKET, objectPath, file);
}

export async function deleteHandoutFile(path: string): Promise<void> {
  if (!path || path.startsWith("data:") || path.startsWith("http")) return;
  const parsed = parseQualifiedPath(path);
  if (!parsed) return;

  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client.storage.from(parsed.bucket).remove([parsed.objectPath]);
  if (error) {
    console.warn("[handoutFileStorage] Failed to delete handout file.", error);
  }
}

export async function getHandoutFileUrl(path: string): Promise<string> {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http")) return path;

  const parsed = parseQualifiedPath(path);
  if (!parsed) return path;

  const client = getSupabaseClient();
  if (!client) return "";

  const { data, error } = await client.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60 * 60);
  if (error) {
    console.warn("[handoutFileStorage] Failed to sign handout file URL.", error);
    return "";
  }
  return data.signedUrl;
}
