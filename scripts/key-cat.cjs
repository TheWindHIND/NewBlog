/**
 * 芙宁娜猫猫立绘处理：
 * 1. 绿幕抠图 → 透明 PNG（去绿边 despill）
 * 2. 以「第一张图的 alpha 包围盒」为准统一裁切，保证睁眼/闭眼两张严格对齐
 * 3. 输出 aylen-full.png / aylen-full-closed.png，并生成网格调试图
 *
 * 用法: node scripts/key-cat.cjs <睁眼png> [闭眼png]
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = 'raw-assets/cat';
const DBG = 'raw-assets/cat';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DBG, { recursive: true });

const T1 = 12;  // 绿通道超出 max(r,b) 以内 → 完全不透明
const T2 = 96;  // 超出此值 → 完全透明

/** 绿幕抠图，返回 RGBA raw */
async function keyGreen(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) {
    const o = i * C;
    const r = out[o], b = out[o + 2];
    let g = out[o + 1];
    const gmax = Math.max(r, b);
    const d = g - gmax;
    let a = 255;
    if (d >= T2) a = 0;
    else if (d > T1) a = Math.round(255 * (1 - (d - T1) / (T2 - T1)));
    if (a < 255 && d > 0) g = Math.min(g, gmax); // 去绿边
    // 抹掉右下角的生成水印（该区域不包含角色）
    if (i % W > W * 0.76 && Math.floor(i / W) > H * 0.88) a = 0;
    out[o + 1] = g;
    out[o + 3] = a;
  }
  return { buf: out, width: W, height: H };
}

/** 扫描 alpha>16 的包围盒 */
function alphaBox(raw) {
  const { buf, width: W, height: H } = raw;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (buf[(y * W + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

(async () => {
  const [openSrc, closedSrc] = process.argv.slice(2);
  if (!openSrc) {
    console.error('need open-eyes png');
    process.exit(1);
  }

  const open = await keyGreen(openSrc);
  const box = alphaBox(open);
  const pad = 2;
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  const crop = {
    left,
    top,
    width: Math.min(open.width - left, box.width + pad * 2),
    height: Math.min(open.height - top, box.height + pad * 2),
  };
  console.log('alpha bbox', `${box.width}x${box.height}`, '@', box.left + ',' + box.top);

  const toPng = (raw) =>
    sharp(raw.buf, { raw: { width: raw.width, height: raw.height, channels: 4 } })
      .extract(crop)
      .png()
      .toBuffer({ resolveWithObject: true });

  const openTrim = await toPng(open);
  fs.writeFileSync(path.join(OUT, 'aylen-full.png'), openTrim.data);
  console.log('aylen-full.png', `${openTrim.info.width}x${openTrim.info.height}`,
    Math.round(openTrim.data.length / 1024) + 'KB');

  const TW = openTrim.info.width, TH = openTrim.info.height;

  if (closedSrc) {
    const closed = await keyGreen(closedSrc);
    const closedTrim = await toPng(closed);
    // 与睁眼图同尺寸，保证交叉淡入时严格对齐
    const aligned = await sharp(closedTrim.data).resize(TW, TH, { fit: 'fill' }).png().toBuffer();
    fs.writeFileSync(path.join(OUT, 'aylen-full-closed.png'), aligned);
    console.log('aylen-full-closed.png (aligned)', `${TW}x${TH}`);
  }

  // 网格调试图（白底 + 5%/10% 线）
  const lines = [];
  for (let p = 0; p <= 100; p += 5) {
    const major = p % 10 === 0;
    const color = major ? 'rgba(255,0,90,0.95)' : 'rgba(255,140,0,0.5)';
    const wdt = major ? 1.6 : 0.8;
    const x = Math.round((p / 100) * (TW - 1));
    const y = Math.round((p / 100) * (TH - 1));
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${TH}" stroke="${color}" stroke-width="${wdt}"/>`);
    lines.push(`<line x1="0" y1="${y}" x2="${TW}" y2="${y}" stroke="${color}" stroke-width="${wdt}"/>`);
    if (major) {
      lines.push(`<text x="${x + 3}" y="16" fill="#0090c0" font-size="15" font-family="monospace">${p}</text>`);
      lines.push(`<text x="4" y="${y - 4}" fill="#0090c0" font-size="15" font-family="monospace">${p}</text>`);
    }
  }
  const svg = `<svg width="${TW}" height="${TH}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`;
  const debug = await sharp(openTrim.data)
    .composite([
      { input: { create: { width: TW, height: TH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }, blend: 'dest-over' },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(DBG, '_debug-grid.png'), debug);
  console.log('debug grid → raw-assets/cat/_debug-grid.png');
})();
