/**
 * 参考图结构探针：把参考图降采样成字符图，用来读轮廓比例。
 * 用法: node scripts/probe-refs.cjs <图片> [列数]
 */
const sharp = require('sharp');

const SRC = process.argv[2];
const COLS = Number(process.argv[3] || 64);

(async () => {
  const img = sharp(SRC).ensureAlpha();
  const meta = await img.metadata();
  const rows = Math.max(8, Math.round((COLS * meta.height) / meta.width / 2));
  const { data, info } = await img
    .resize(COLS, rows, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  let out = '';
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const i = (y * COLS + x) * ch;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const blue = (b - r) / 255;
      const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      let c = '.';
      if (blue > 0.20 && sat > 0.15) c = '#';        // 饱和蓝
      else if (blue > 0.06) c = '+';                  // 淡蓝
      else if (lum > 0.90 && sat < 0.10) c = 'O';     // 高光白
      else if (lum > 0.78 && sat < 0.12) c = 'o';     // 浅灰（石/银）
      else if (lum < 0.30) c = '-';                   // 暗部
      else if (lum < 0.55) c = '=';                   // 中暗
      else c = '.';
      line += c;
    }
    out += line + '\n';
  }
  console.log(`${SRC}  ${meta.width}x${meta.height}  -> ${COLS}x${rows}`);
  console.log(out);
})();
