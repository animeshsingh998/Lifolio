import "server-only";
import sharp from "sharp";

/** Longest edge of a stored cover. Grid cards render at ≤ 400px, the detail page at ≤ 1000px. */
export const COVER_MAX_EDGE = 1200;
export const COVER_QUALITY = 80;
export const COVER_CONTENT_TYPE = "image/webp";

export type ProcessedImage = { bytes: Buffer; contentType: typeof COVER_CONTENT_TYPE; width: number; height: number };

/**
 * Normalises any supported upload into a stored cover: auto-rotated from EXIF, capped at
 * COVER_MAX_EDGE on the long side (never enlarged), WebP at COVER_QUALITY, metadata stripped
 * (so phone photos lose their GPS tags). Animated sources keep their first frame.
 * Covers are served as-is afterwards, so this replaces Vercel's per-request optimisation.
 */
export async function processCoverImage(input: Uint8Array | ArrayBuffer): Promise<ProcessedImage> {
  const source = input instanceof ArrayBuffer ? Buffer.from(input) : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const { data, info } = await sharp(source, { failOn: "none", limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: COVER_MAX_EDGE, height: COVER_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: COVER_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, contentType: COVER_CONTENT_TYPE, width: info.width, height: info.height };
}
