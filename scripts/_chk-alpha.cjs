const sharp = require('sharp');
(async () => {
  for (const n of ['aylen-head','aylen-head-closed','aylen-body','aylen-tail']) {
    const { data, info } = await sharp(`public/images/cat/${n}.webp`).raw().toBuffer({ resolveWithObject: true });
    let vis = 0; const c = info.channels;
    for (let i = 0; i < info.width * info.height; i++) if (data[i * c + 3] > 128) vis++;
    console.log(n.padEnd(18), `${info.width}x${info.height}`, 'visible%', (100*vis/(info.width*info.height)).toFixed(1));
  }
})();
