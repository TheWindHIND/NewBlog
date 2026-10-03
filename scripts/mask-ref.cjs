/**
 * 白度掩膜图：把参考图里的「白色构件」单独抠成黑底白图，便于读轮廓。
 * 用法：node scripts/mask-ref.cjs <图> <出图> [模式] [阈值]
 *   模式 white ：高亮度 + 低饱和（白色构件）
 *   模式 bright：高亮度（白构件 + 蓝刃 + 强光晕）
 *   阈值：默认 white=185/46, bright=150
 */
const sharp = require('sharp');

(async () => {
  const file = process.argv[2];
  const out = process.argv[3];
  const mode = process.argv[4] || 'white';
  const T = process.argv[5] ? Number(process.argv[5]) : null;

  const img = sharp(file).removeAlpha();
  const meta = await img.metadata();
  const raw = await img.raw().toBuffer();
  const W = meta.width;
  const H = meta.height;
  // 以真实缓冲区长度反推通道数（metadata 在 removeAlpha 之后仍可能报 4，会造成 stride 错位）
  const CH = Math.round(raw.length / (W * H));
  if (!Number.isFinite(CH) || CH < 1) throw new Error('无法推断通道数');

  const buf = Buffer.alloc(W * H);
  for (let p = 0; p < W * H; p++) {
    const r = raw[p * CH];
    const g = raw[p * CH + 1];
    const b = raw[p * CH + 2];
    const mn = Math.min(r, g, b);
    const sat = Math.max(r, g, b) - mn;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let v = 0;
    if (mode === 'white') {
      const t = T === null ? 185 : T;
      const s = T === null ? 46 : 60;
      v = mn >= t && sat <= s ? 255 : 0;
    } else {
      v = lum >= (T === null ? 150 : T) ? 255 : 0;
    }
    buf[p] = v;
  }

  await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).png().toFile(out);
  console.log(`${out}  ${W}x${H}  mode=${mode}  T=${T ?? 'default'}`);
})();
