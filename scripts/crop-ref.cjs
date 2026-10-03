/**
 * 参考图局部放大：node scripts/crop-ref.cjs <src> <out> x0 y0 x1 y1 [scale]
 * 坐标为 0~1 归一化。
 */
const sharp = require('sharp');

(async () => {
  const [src, out, x0, y0, x1, y1, sc] = process.argv.slice(2);
  const s = Number(sc || 3);
  const meta = await sharp(src).metadata();
  const left = Math.round(Number(x0) * meta.width);
  const top = Math.round(Number(y0) * meta.height);
  const w = Math.round((Number(x1) - Number(x0)) * meta.width);
  const h = Math.round((Number(y1) - Number(y0)) * meta.height);
  await sharp(src)
    .extract({ left, top, width: w, height: h })
    .resize({ width: Math.round(w * s), kernel: 'lanczos3' })
    .png()
    .toFile(out);
  console.log(`crop ${left},${top} ${w}x${h} -> ${out}`);
})();
