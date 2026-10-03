/**
 * 绿幕 UI 图标抠图（通用）
 *
 * 用法：node scripts/key-ui.cjs <输入png> <输出webp> [目标边长]
 *
 * 要点（踩过坑，别改）：
 *  · ImageGen 的 background:"transparent" 会把 24px 灰白棋盘格烘进像素，不可抠；
 *    必须走绿幕（background:"opaque" + flat pure green RGB(0,255,0)）。
 *  · 生成图右下角有「AI生成」水印，直接抠会撑大包围盒 → 强制清掉该区域。
 *  · 绿幕边缘有溢色，需 despill：把 g 压回 max(r,b)。
 */
const sharp = require('sharp');

const [, , IN = 'raw-assets/toggle/in.png', OUT = 'public/images/ui/theme-toggle.webp', SIZE = '256'] =
  process.argv;
const TARGET = parseInt(SIZE, 10);

// 水印区域（相对比例）
const WM_X = 0.74;
const WM_Y = 0.86;

(async () => {
  const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;

  const out = Buffer.alloc(W * H * 4);
  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * C;
      const t = i * 4;
      let r = data[o];
      let g = data[o + 1];
      let b = data[o + 2];

      // 绿幕判定：绿色相对强度
      const d = g - Math.max(r, b);
      let a = 255;
      if (d >= 96) a = 0;
      else if (d > 10) a = Math.round(255 * (1 - (d - 10) / 86));

      // despill：压掉残留的绿
      if (a < 255) {
        const cap = Math.max(r, b);
        if (g > cap) g = cap;
      }

      // 水印区域强制透明
      if (x > W * WM_X && y > H * WM_Y) a = 0;

      out[t] = r;
      out[t + 1] = g;
      out[t + 2] = b;
      out[t + 3] = a;

      if (a > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) throw new Error('抠图后没有任何不透明像素，检查阈值/输入图');

  // 取正方形包围盒（以内容中心为心），留 6% 余量
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const side = Math.max(maxX - minX, maxY - minY) * 1.12;
  const left = Math.max(0, Math.round(cx - side / 2));
  const top = Math.max(0, Math.round(cy - side / 2));
  const w = Math.min(W - left, Math.round(side));
  const h = Math.min(H - top, Math.round(side));
  console.log(`内容包围盒 ${maxX - minX}x${maxY - minY} → 裁 ${w}x${h} @ (${left},${top})`);

  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: w, height: h })
    .resize(TARGET, TARGET, { kernel: 'lanczos3' })
    .webp({ quality: 92, effort: 6 })
    .toFile(OUT);

  const m = await sharp(OUT).metadata();
  console.log(`→ ${OUT}  ${m.width}x${m.height}  ${(require('fs').statSync(OUT).size / 1024).toFixed(1)}KB`);
})();
