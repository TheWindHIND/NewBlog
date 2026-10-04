/**
 * 通用网格标尺：node scripts/_grid.cjs <x0%> <y0%> <x1%> <y1%>
 * 输出 raw-assets/cat/_grid.png，细线 = 2%，粗线（橙）= 10%，蓝色竖线 = 10%
 */
const sharp = require('sharp');
const W = 760,
  H = 1247;

(async () => {
  const [x0p, y0p, x1p, y1p] = process.argv.slice(2).map(Number);
  const BOX = {
    left: Math.round((x0p / 100) * W),
    top: Math.round((y0p / 100) * H),
    width: Math.round(((x1p - x0p) / 100) * W),
    height: Math.round(((y1p - y0p) / 100) * H),
  };
  const OUT_W = 1400;
  const SC = OUT_W / BOX.width;

  const norm = await sharp('raw-assets/cat/aylen-full-hat.png').resize(W, H, { fit: 'fill' }).png().toBuffer();
  const base = await sharp(norm).extract(BOX).resize({ width: OUT_W }).png().toBuffer();
  const bm = await sharp(base).metadata();

  const ov = [];
  for (let p = 0; p <= 100; p += 2) {
    const x = (p / 100) * W;
    if (x < BOX.left || x > BOX.left + BOX.width) continue;
    const px = Math.round((x - BOX.left) * SC);
    const major = p % 10 === 0;
    const wpx = major ? 3 : 1;
    ov.push({
      input: Buffer.from(`<svg width="${wpx}" height="${bm.height}" xmlns="http://www.w3.org/2000/svg"><rect width="${wpx}" height="100%" fill="${major ? '#ffd600' : '#ff00b4'}"/></svg>`),
      left: Math.min(px, bm.width - 1), top: 0,
    });
    const y = (p / 100) * H;
    if (y < BOX.top || y > BOX.top + BOX.height) continue;
    const py = Math.round((y - BOX.top) * SC);
    ov.push({
      input: Buffer.from(`<svg width="${bm.width}" height="${wpx}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="${wpx}" fill="${major ? '#ff3b00' : '#00e5ff'}"/></svg>`),
      left: 0, top: Math.min(py, bm.height - 1),
    });
  }
  await sharp(base).composite(ov).png().toFile('raw-assets/cat/_grid.png');
  console.log('crop', x0p + '~' + x1p + '% x', y0p + '~' + y1p + '%  细线2% 粗线10%');
})();
