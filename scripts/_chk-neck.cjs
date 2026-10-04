const sharp = require('sharp');
const W = 760, H = 1247;
const BG = { r: 250, g: 246, b: 236, alpha: 1 };
const L = (n) => `public/images/cat/${n}.webp`;

// sharp 同一管线里 composite + extract 顺序会打架，分两步走
async function stage(layers, out, box, width = 900) {
  const buf = await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toBuffer();
  await sharp(buf).extract(box).resize({ width }).png().toFile(out);
}

(async () => {
  const head = (dy, dx = 0) => ({ input: L('aylen-head'), left: Math.round(dx), top: Math.round(dy) });
  const body = { input: L('aylen-body'), left: 0, top: 0 };
  const tail = { input: L('aylen-tail'), left: 0, top: 0 };
  const neck = { left: 140, top: 600, width: 420, height: 330 };
  const tailBox = { left: 420, top: 620, width: 340, height: 320 };

  await stage([tail, body, head(0)], 'raw-assets/cat/_neck-rest.png', neck);
  await stage([tail, body, head(H * 0.008)], 'raw-assets/cat/_neck-down.png', neck);
  await stage([tail, body, head(-H * 0.008)], 'raw-assets/cat/_neck-up.png', neck);
  await stage([tail, body], 'raw-assets/cat/_tail-rest.png', tailBox);
  await stage([body, tail], 'raw-assets/cat/_tail-over.png', tailBox);
  console.log('ok');
})();
