const sharp = require('sharp');
const W = 760, H = 1247;
(async () => {
  const layers = ['aylen-body', 'aylen-head'];
  const canvas = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 247, g: 243, b: 232, alpha: 1 } } })
    .composite(layers.map((n, i) => ({ input: `public/images/cat/${n}.webp`, left: 0, top: 0 })))
    .png().toBuffer();
  await sharp(canvas).extract({ left: 300, top: 560, width: 460, height: 460 }).resize({ width: 820 }).toFile('raw-assets/cat/_chk-stack.png');
  // 头/身体分别出图，看切割位置
  await sharp(`public/images/cat/aylen-head.webp`).flatten({ background: { r: 255, g: 0, b: 128 } }).extract({ left: 300, top: 560, width: 460, height: 460 }).resize({ width: 820 }).toFile('raw-assets/cat/_chk-head.png');
  await sharp(`public/images/cat/aylen-body.webp`).flatten({ background: { r: 0, g: 200, b: 255 } }).extract({ left: 300, top: 560, width: 460, height: 460 }).resize({ width: 820 }).toFile('raw-assets/cat/_chk-body.png');
  console.log('ok');
})();
