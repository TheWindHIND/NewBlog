/**
 * 尾巴区逐行分类扫描：把每一行按「透明 / 线稿 / 白毛 / 皮肤 / 蓝 / 深蓝」分段打印，
 * 用于确定尾巴可见轮廓（尤其是被手指、裙子挡住的那几行）的精确坐标。
 *
 *   node scripts/_probe-tail.cjs [y0 y1 step]
 */
const sharp = require('sharp');
const path = require('path');

const P = (p) => path.join(__dirname, '..', p);
const IN = P('raw-assets/cat/aylen-full-hat.png');

const [, , ay0 = '62', ay1 = '90', astep = '1'] = process.argv;
const y0 = Number(ay0), y1 = Number(ay1), step = Number(astep);

/** 像素归类 */
function classify(r, g, b, a) {
  if (a < 40) return '.';                       // 透明
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 118) return '#';                    // 线稿/深色
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  if (sat < 0.12 && lum > 200) return 'W';      // 白（尾巴毛 / 裙子）
  if (sat < 0.12) return 'w';                   // 灰
  if (r > g && g > b && r - b > 25 && lum > 150) return 'S';  // 皮肤
  if (b > r && b > g) return lum > 150 ? 'B' : 'N';           // 蓝（蝴蝶结）/ 深蓝（外套）
  return '?';
}

(async () => {
  const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;
  for (let yp = y0; yp <= y1; yp += step) {
    const y = Math.round((yp / 100) * H);
    const runs = [];
    let prev = null;
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * channels;
      const c = classify(data[p], data[p + 1], data[p + 2], data[p + 3]);
      if (c !== prev) {
        runs.push({ c, x0: x, x1: x });
        prev = c;
      } else {
        runs[runs.length - 1].x1 = x;
      }
    }
    const txt = runs
      .filter((r) => r.c !== '.')
      .map((r) => `${r.c}${((r.x0 / W) * 100).toFixed(1)}-${((r.x1 / W) * 100).toFixed(1)}`)
      .join(' ');
    console.log(String(yp).padStart(2) + '%  ' + (txt || '(全透明)'));
  }
})();
