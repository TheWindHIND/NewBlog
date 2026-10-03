const sharp = require('sharp');

(async () => {
  const dir = 'public/images/cat';
  const names = ['aylen-tail', 'aylen-body', 'aylen-head-closed'];
  const bufs = [];
  for (const n of names) {
    const b = await sharp(`${dir}/${n}.webp`).toBuffer();
    const m = await sharp(b).metadata();
    console.log(n, m.width + 'x' + m.height);
    bufs.push({ input: b, top: 0, left: 0 });
  }
  const base = await sharp({
    create: { width: 760, height: 1247, channels: 4, background: { r: 11, g: 21, b: 38, alpha: 1 } },
  }).png().toBuffer();
  const bm = await sharp(base).metadata();
  console.log('base', bm.width + 'x' + bm.height);

  // 注意：sharp 的 extract 作用于「输入阶段」，不能和 composite 串在同一条链上
  const composed = await sharp(base).composite(bufs).png().toBuffer();

  const out = await sharp(composed)
    .extract({ left: 76, top: 370, width: 608, height: 400 })
    .resize({ width: 900 })
    .png()
    .toFile('raw-assets/cat/_blink-check.png');
  console.log('ok', out.width + 'x' + out.height);
})();
