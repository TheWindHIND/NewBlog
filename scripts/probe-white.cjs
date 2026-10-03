/**
 * 白度掩膜字符图：把参考图里的「白色构件」与「彩色刀身/背景」分开看。
 * 用法：node scripts/probe-white.cjs <图> [列数] [起始行] [结束行]
 *   # = 白色构件（高亮度 + 低饱和）
 *   + = 亮但有色（蓝刃 / 光晕）
 *   - = 中等
 *   . = 暗背景
 *   ' ' = 极暗
 */
const sharp = require('sharp');

(async () => {
  const file = process.argv[2];
  const COLS = Number(process.argv[3] || 110);
  const r0 = process.argv[4] ? Number(process.argv[4]) : 0;
  const r1 = process.argv[5] ? Number(process.argv[5]) : 1;

  const img = sharp(file).removeAlpha();
  const meta = await img.metadata();
  const raw = await img.raw().toBuffer();
  const CH = meta.channels;
  const W = meta.width;
  const H = meta.height;

  const y0 = Math.round(r0 * H);
  const y1 = Math.round(r1 * H);
  const stepX = W / COLS;
  const stepY = (y1 - y0) / (COLS * 0.42);

  const out = [];
  for (let y = y0; y < y1; y += stepY) {
    let line = '';
    for (let x = 0; x < W; x += stepX) {
      const px = Math.round(x);
      const py = Math.round(Math.min(H - 1, y));
      const i = (py * W + px) * CH;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx - mn;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (mn >= 185 && sat <= 46) line += '#';
      else if (lum >= 175) line += '+';
      else if (lum >= 110) line += '-';
      else if (lum >= 60) line += '.';
      else line += ' ';
    }
    out.push(line);
  }
  console.log(`${file}  ${W}x${H}  -> ${COLS}x${out.length}   (行 ${r0}..${r1})`);
  console.log('='.repeat(COLS));
  console.log(out.join('\n'));
})();
