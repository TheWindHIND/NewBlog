/**
 * 给参考图叠网格标尺，便于读出归一化坐标。
 * 用法：node scripts/grid-ref.cjs <入图> <出图> [分格数]
 *   每 1/n 一条细线（品红），每 4/n 一条粗线（黄）。
 *   每 5 格标一个百分数（左上角起算）。
 */
const sharp = require('sharp');

(async () => {
  const [inp, outp, nArg] = [process.argv[2], process.argv[3], Number(process.argv[4] || 20)];
  const meta = await sharp(inp).metadata();
  const W = meta.width;
  const H = meta.height;

  const lines = [];
  for (let i = 0; i <= nArg; i++) {
    const major = i % 5 === 0;
    const col = major ? 'rgba(255,214,0,0.95)' : 'rgba(255,0,180,0.6)';
    const wdt = major ? Math.max(2, Math.round(W / 400)) : 1;
    const x = Math.round((i / nArg) * W);
    lines.push({ input: Buffer.from(`<svg width="1" height="${H}"><rect width="1" height="${H}" fill="${col}"/></svg>`), left: Math.min(x, W - 1), top: 0, blend: 'over' });
    const y = Math.round((i / nArg) * H);
    lines.push({ input: Buffer.from(`<svg width="${W}" height="1"><rect width="${W}" height="1" fill="${col}"/></svg>`), left: 0, top: Math.min(y, H - 1), blend: 'over' });
  }
  // 宽度补偿：把 1px 线加粗到指定像素数
  const thick = lines.map((l, i) => l);
  await sharp(inp).composite(thick).png().toFile(outp);
  console.log(`${outp}  ${W}x${H}  格=1/${nArg}`);
})();
