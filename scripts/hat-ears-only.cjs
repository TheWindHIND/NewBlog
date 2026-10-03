/**
 * 只把「重绘区域中新增的部分」（即两只藏青猫耳）取出，贴回原立绘。
 * 原画其余像素 100% 不动 → 不会出现重绘导致的画质软化。
 *
 * 用法: node scripts/hat-ears-only.cjs <重绘png> <底图> <输出>
 */
const sharp = require('sharp');
const fs = require('fs');

const SRC = process.argv[2];
const BASE = process.argv[3] || 'raw-assets/cat/aylen-full-eyes.png';
const OUT = process.argv[4] || 'raw-assets/cat/aylen-full-hat.png';

const TW = 1536, TH = 1024;
const FIT_W = Math.round(TW * 0.94);
const CROP_H_RATIO = 0.335;
const DILATE_DOWN = 24;      // 掩膜向下扩张，让耳根压到帽面上
const FEATHER = 1.4;

(async () => {
  const meta = await sharp(BASE).metadata();
  const W = meta.width, H = meta.height, C = 4;
  const cropH = Math.round(H * CROP_H_RATIO);
  const fitH = Math.round(cropH * FIT_W / W);
  const left = Math.round((TW - FIT_W) / 2);
  const top = Math.round((TH - fitH) / 2);

  // 1) 绿幕抠图
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const srcC = info.channels;
  const n = TW * TH;
  const keyed = Buffer.alloc(n * C);
  for (let i = 0; i < n; i++) {
    const o = i * srcC, t = i * C;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const d = g - Math.max(r, b);
    let a = 255;
    if (d >= 96) a = 0; else if (d > 12) a = Math.round(255 * (1 - (d - 12) / 84));
    keyed[t] = r; keyed[t + 1] = g; keyed[t + 2] = b; keyed[t + 3] = a;
  }

  // 2) 还原到原图坐标
  const patch = await sharp(keyed, { raw: { width: TW, height: TH, channels: 4 } })
    .extract({ left, top, width: FIT_W, height: fitH })
    .resize(W, cropH, { fit: 'fill' })
    .raw().toBuffer();

  // 3) 取原图 alpha
  const baseRaw = await sharp(BASE).ensureAlpha().raw().toBuffer();
  console.log('patch', W + 'x' + cropH, 'base', W + 'x' + H);

  // 4) 掩膜 = 原图透明处 + 重绘有内容处 → 只保留「新增」
  const m = new Uint8Array(W * H);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const pa = patch[i * 4 + 3];
      const oa = baseRaw[i * 4 + 3];
      if (pa > 100 && oa < 128) m[i] = 255;
    }
  }
  // 向下扩张：把耳根压进帽面
  const m2 = new Uint8Array(W * H);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      for (let d = 0; d <= DILATE_DOWN; d++) {
        const yy = y + d; if (yy >= cropH) break;
        m2[yy * W + x] = 255;
      }
    }
  }
  // 羽化
  const soft = new Uint8Array(W * H);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || yy >= cropH || xx < 0 || xx >= W) continue;
        s += m2[yy * W + xx]; c++;
      }
      soft[y * W + x] = Math.round(s / c);
    }
  }

  // 5) 合成：仅在掩膜内用 patch 覆盖 base
  const out = Buffer.from(baseRaw);
  let touched = 0;
  for (let i = 0; i < W * H; i++) {
    const a = soft[i];
    if (!a) continue;
    touched++;
    const o = i * 4, w = a / 255;
    // 叠加：patch over base
    const pa = (patch[o + 3] / 255) * w;
    for (let c = 0; c < 3; c++) {
      out[o + c] = Math.round(patch[o + c] * pa + out[o + c] * (1 - pa));
    }
    out[o + 3] = Math.max(out[o + 3], Math.round(pa * 255));
  }
  console.log('ear px', touched);

  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
  console.log('→', OUT);

  await sharp(OUT).resize(560, null, { kernel: 'lanczos3' }).png().toFile('raw-assets/cat/_final-small.png');
  await sharp(OUT)
    .extract({ left: 0, top: 0, width: W, height: Math.round(H * 0.36) })
    .resize(1100, null, { kernel: 'lanczos3' })
    .png().toFile('raw-assets/cat/_hat-check.png');
  console.log('→ raw-assets/cat/_final-small.png / _hat-check.png');
})();
