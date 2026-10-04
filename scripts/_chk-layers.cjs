/** 把 tail / body / head 三个图层分别铺在对比色上，看清各自的边界 */
const sharp = require('sharp');
const W = 760,
  H = 1247;
const BG = { r: 255, g: 0, b: 128, alpha: 1 };

(async () => {
  for (const n of ['tail', 'body', 'head']) {
    const buf = await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
      .composite([{ input: `public/images/cat/aylen-${n}.webp`, left: 0, top: 0 }])
      .png()
      .toBuffer();
    await sharp(buf).resize({ width: 380 }).png().toFile(`raw-assets/cat/_lyr-${n}.png`);
  }
  console.log('ok');
})();
