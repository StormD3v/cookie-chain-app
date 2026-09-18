/**
 * Convert RGBA mascot PNGs to WebP (preserves transparency, ~JPG file size).
 * cookie-chef-baking has no alpha so keep the existing JPG for it.
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "../src/assets");

const conversions = [
  // RGBA PNGs → WebP (lossless=false, quality 80, preserve alpha)
  { src: "cookie-jar-hug.png",         dst: "cookie-jar-hug.webp",         q: 80 },
  { src: "cookie-running.png",          dst: "cookie-running.webp",          q: 80 },
  { src: "sidebar-cookie-cluster.png",  dst: "sidebar-cookie-cluster.webp",  q: 80 },
  // cookie-chef-baking has no alpha — convert from existing PNG at same quality
  { src: "cookie-chef-baking.png",      dst: "cookie-chef-baking.webp",      q: 80 },
];

for (const { src, dst, q } of conversions) {
  const srcPath = `${ASSETS}/${src}`;
  const dstPath = `${ASSETS}/${dst}`;
  const meta = await sharp(srcPath).metadata();
  console.log(`\nSource: ${src}  (${meta.width}×${meta.height}  channels=${meta.channels}  hasAlpha=${meta.hasAlpha})`);

  // Downscale if needed — same logic as Round 19 JPG pass
  // Target: 2× retina for reasonable display widths
  const targets = {
    "cookie-jar-hug.png":        { w: 800,  h: 533  },
    "cookie-running.png":         { w: 800,  h: 533  },
    "sidebar-cookie-cluster.png": { w: 768,  h: 512  },
    "cookie-chef-baking.png":     { w: 1086, h: 362  },
  };
  const t = targets[src];

  await sharp(srcPath)
    .resize(t.w, t.h, { fit: "cover", position: "center" })
    .webp({ quality: q, lossless: false, alphaQuality: 90 })
    .toFile(dstPath);

  const { size: srcSize } = await import("fs").then(m => m.promises.stat(srcPath));
  const { size: dstSize } = await import("fs").then(m => m.promises.stat(dstPath));
  const pct = Math.round((1 - dstSize / srcSize) * 100);
  console.log(`Output: ${dst}  ${Math.round(dstSize/1024)}KB  (was ${Math.round(srcSize/1024)}KB, -${pct}%)`);
}

console.log("\nDone. Check alpha channels are preserved by loading in a browser.");
