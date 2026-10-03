const sharp = require('sharp');
const MAP = { x0: 0.163, w: 0.674 };
(async () => {
  const jobs = [
    ['window', 480, 30, 700, 200],
    ['fireplace', 0, 130, 170, 345],
  ];
  for (const t of ['ousia', 'pneuma']) {
    const src = `raw-assets/ref/box-${t}.png`;
    const meta = await sharp(src).metadata();
    const sc = (meta.width * MAP.w) / 800;
    const ox = meta.width * MAP.x0;
    const oy = meta.height * 0.102;
    for (const [name, x0, y0, x1, y1] of jobs) {
      await sharp(src)
        .extract({
          left: Math.round(ox + x0 * sc),
          top: Math.round(oy + y0 * sc),
          width: Math.round((x1 - x0) * sc),
          height: Math.round((y1 - y0) * sc),
        })
        .resize({ width: 760 })
        .toFile(`raw-assets/ref/zoom-${name}-${t}.png`);
    }
  }
  console.log('ok');
})();
