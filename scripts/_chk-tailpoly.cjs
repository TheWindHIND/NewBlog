/**
 * 尾巴多边形核对：把 TAIL_POLY 描边（品红实线）+ 枢轴（绿点）画在原画上放大，
 * 直接看多边形有没有切进「手/袖口/裙子」或漏掉尾巴本身。
 *
 *   node scripts/_chk-tailpoly.cjs
 */
const sharp = require('sharp');
const path = require('path');

const P = (p) => path.join(__dirname, '..', p);
const IN = P('raw-assets/cat/aylen-full-hat.png');

// 与 slice-cat.cjs 保持一致（改这里要同步改那边）
const TAIL_POLY = [
  [76.6, 64.6], [79.4, 63.8], [82.4, 64.2], [85.0, 65.9], [87.2, 68.2],
  [88.9, 71.0], [89.9, 74.0], [90.2, 76.6], [89.6, 79.2], [88.1, 81.6],
  [85.7, 83.6], [82.0, 85.1], [77.8, 86.1], [73.2, 86.6], [68.6, 86.6], [64.0, 86.0],
  [63.0, 83.2], [63.6, 81.2], [66.0, 80.0], [69.8, 79.6], [73.2, 79.2],
  [75.0, 77.0], [75.6, 73.4], [75.7, 69.4], [75.9, 66.6],
];
const PIVOT = [66.0, 84.5];
const BOX = [0.52, 0.56, 1.0, 0.96]; // 归一化裁切框

(async () => {
  const meta = await sharp(IN).metadata();
  const { width: W, height: H } = meta;
  const pts = TAIL_POLY.map(([x, y]) => `${(x / 100) * W},${(y / 100) * H}`).join(' ');
  const [px, py] = [(PIVOT[0] / 100) * W, (PIVOT[1] / 100) * H];

  const svg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
      `<polygon points="${pts}" fill="none" stroke="#ff00ff" stroke-width="3"/>` +
      `<circle cx="${px}" cy="${py}" r="6" fill="#00ff66" stroke="#000" stroke-width="2"/>` +
      `</svg>`
  );

  const left = Math.round(BOX[0] * W);
  const top = Math.round(BOX[1] * H);
  const w = Math.round((BOX[2] - BOX[0]) * W);
  const h = Math.round((BOX[3] - BOX[1]) * H);

  const composed = await sharp(IN).composite([{ input: svg }]).png().toBuffer();
  const png = await sharp(composed).extract({ left, top, width: w, height: h }).toBuffer();
  // 4 倍放大，但限制输出宽度避免过大
  const scale = Math.min(4, 1400 / w);
  await sharp(png)
    .resize({ width: Math.round(w * scale), kernel: 'nearest' })
    .png()
    .toFile(P('raw-assets/cat/_chk-tailpoly.png'));
  console.log('→ raw-assets/cat/_chk-tailpoly.png', `${w}x${h} @${scale.toFixed(1)}x`);
})();
