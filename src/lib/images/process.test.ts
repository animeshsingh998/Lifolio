import sharp, { type Sharp } from "sharp";
import { describe, expect, it } from "vitest";
import { COVER_MAX_EDGE, processCoverImage } from "./process";

const png = (width: number, height: number, extra?: (s: Sharp) => Sharp) => {
  let s = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } } });
  if (extra) s = extra(s);
  return s.png().toBuffer();
};

describe("processCoverImage", () => {
  it("shrinks a large image to the max edge and keeps its aspect ratio", async () => {
    const out = await processCoverImage(await png(3000, 2000));
    expect(out.contentType).toBe("image/webp");
    expect(out.width).toBe(COVER_MAX_EDGE);
    expect(out.height).toBe(800);
    const meta = await sharp(out.bytes).metadata();
    expect(meta.format).toBe("webp");
  });

  it("never enlarges a small image", async () => {
    const out = await processCoverImage(await png(300, 450));
    expect([out.width, out.height]).toEqual([300, 450]);
  });

  it("strips metadata", async () => {
    const src = await png(400, 400, (s) => s.withMetadata({ exif: { IFD0: { ImageDescription: "secret location" } } }));
    const out = await processCoverImage(src);
    const meta = await sharp(out.bytes).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("rejects bytes that are not an image", async () => {
    await expect(processCoverImage(new TextEncoder().encode("not an image"))).rejects.toThrow();
  });
});
