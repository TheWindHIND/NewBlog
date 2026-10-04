// 从 slice-cat.cjs 抽出遮罩生成链路，逐步打印覆盖率
const sharp = require('sharp');
const PAD = 60;
const pct = (p, total) => Math.round((p / 100) * total);
function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
function offsetPoly(pts, marginOf) {
  const n = pts.length;
  const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  return pts.map(([x, y], i) => {
    const p = pts[(i - 1 + n) % n]; const q = pts[(i + 1) % n];
    const t = unit([q[0] - p[0], q[1] - p[1]]);
    let nx = -t[1]; let ny = t[0];
    const step = 0.6;
    if (inside(pts, x + nx * step, y + ny * step)) { nx = -nx; ny = -ny; }
    const m = marginOf(x); const scale = m / 100;
    return [x + nx * scale, y + ny * scale];
  });
}
const TAIL_POLY = [
  [78.3, 67.4], [77.9, 66.2], [79.4, 65.4], [81.4, 65.4], [83.5, 66.0],
  [85.0, 67.0], [86.6, 68.2], [87.7, 69.4], [89.3, 70.8], [90.0, 71.8],
  [90.8, 72.8], [90.9, 74.0], [90.8, 75.0], [90.5, 76.2], [90.8, 77.4],
  [90.0, 78.8], [89.2, 79.6], [91.3, 80.6], [91.1, 81.7], [90.8, 82.6],
  [89.4, 83.5], [89.2, 84.5], [89.8, 85.6],
  [87.6, 86.6], [84.0, 87.2], [79.0, 87.5], [74.0, 87.6], [68.8, 87.0],
  [69.6, 85.4], [70.3, 84.5], [72.2, 83.3], [74.4, 82.3], [77.2, 81.3],
  [78.4, 80.2], [78.2, 79.2], [78.9, 78.2], [79.4, 77.2], [81.0, 76.2],
  [81.0, 75.2], [80.8, 74.2], [80.9, 73.2], [80.1, 72.2], [79.3, 71.2],
  [77.6, 70.2], [76.6, 69.1], [76.4, 68.0], [76.7, 67.2],
];
const TAIL_MARGIN = 1.0;

async function cov(buf, label) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let on = 0; const c = info.channels;
  for (let i = 0; i < info.width * info.height; i++) if (data[i * c] > 128) on++;
  console.log(label.padEnd(14), `${info.width}x${info.height} ch=${c}`, 'white%', (100 * on / (info.width * info.height)).toFixed(1));
}

(async () => {
  const meta = await sharp('raw-assets/cat/aylen-full-hat.png').metadata();
  const scale = Math.min(1, 760 / meta.width);
  const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
  const IW = w, IH = h;
  const polySVG = (pts, feather = 0) =>
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    (feather ? `<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${feather}"/></filter></defs>` : '') +
    `<polygon points="${pts.map(([x, y]) => `${pct(x, IW)},${pct(y, IH)}`).join(' ')}" fill="#fff"` +
    (feather ? ' filter="url(#f)"' : '') + `/></svg>`;

  await cov(Buffer.from(polySVG(TAIL_POLY, 0)), 'TAIL_POLY');
  const TAIL_OUT = offsetPoly(TAIL_POLY, () => TAIL_MARGIN);
  const bad = TAIL_OUT.filter(([x, y]) => !isFinite(x) || !isFinite(y));
  console.log('TAIL_OUT NaN points:', bad.length, 'first few:', JSON.stringify(TAIL_OUT.slice(0, 3)));
  await cov(Buffer.from(polySVG(TAIL_OUT, 0)), 'TAIL_OUT');
  await cov(Buffer.from(polySVG(TAIL_OUT, 0.8)), 'TAIL_OUT+blur');
})();
