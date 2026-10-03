const sharp = require('sharp');
(async () => {
  for (const t of ['ousia', 'pneuma']) {
    const src = `raw-assets/ref/box-${t}.png`;
    const meta = await sharp(src).metadata();
    const left = Math.round(meta.width * 0.10);
    const width = Math.round(meta.width * 0.80);
    const top = Math.round(meta.height * 0.070);
    const height = Math.round(meta.height * 0.33);
    await sharp(src).extract({ left, top, width, height }).resize({ width: 1500 }).toFile(`raw-assets/ref/box-${t}-card.png`);
  }
  console.log('ok');
})();
