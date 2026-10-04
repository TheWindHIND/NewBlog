const sharp = require('sharp');
const W = 760, H = 1247;
const SRC = 'raw-assets/cat/aylen-full-hat.png';
const BOX = { left: 100, top: 600, width: 560, height: 360 };
const OUT_W = 1400;
const SC = OUT_W / BOX.width;

(async () => {
  const norm = await sharp(SRC).resize(W, H, { fit: 'fill' }).png().toBuffer();
  const base = await sharp(norm).extract(BOX).resize({ width: OUT_W }).png().toBuffer();
  const bm = await sharp(base).metadata();
  console.log('base', bm.width, 'x', bm.height, ' SC=', SC);

  const overlays = [];
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * W;
    if (x < BOX.left || x > BOX.left + BOX.width) continue;
    const px = Math.round((x - BOX.left) * SC);
    const major = i % 2 === 0, wpx = major ? 3 : 1;
    overlays.push({ input: Buffer.from(`<svg width="${wpx}" height="${bm.height}" xmlns="http://www.w3.org/2000/svg"><rect width="${wpx}" height="100%" fill="${major ? '#ffd600' : '#ff00b4'}"/></svg>`), left: Math.min(px, bm.width - 1), top: 0 });
  }
  for (let i = 0; i <= 50; i++) {
    const y = (i / 50) * H;
    if (y < BOX.top || y > BOX.top + BOX.height) continue;
    const py = Math.round((y - BOX.top) * SC);
    const major = i % 5 === 0, hpx = major ? 3 : 1;
    overlays.push({ input: Buffer.from(`<svg width="${bm.width}" height="${hpx}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="${hpx}" fill="${major ? '#ff3b00' : '#00e5ff'}"/></svg>`), left: 0, top: Math.min(py, bm.height - 1) });
  }
  await sharp(base).composite(overlays).png().toFile('raw-assets/cat/_grid-neck.png');
  console.log('x: 细线每 5%（黄 10%），最左细线 x=15%  |  y: 细线每 2%（橙 10%），最上细线 y=50%');
})();
