/** 逐列打印「头部/头发」下沿（最后一个不透明像素的 y%），用于设计头部图层的切割曲线 */
const sharp = require('sharp');
const W = 760,
  H = 1247;

(async () => {
  const { data, info } = await sharp('raw-assets/cat/aylen-full-hat.png')
    .resize(W, H, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const a = (x, y) => data[(y * W + x) * ch + 3];

  const rows = [];
  for (let xp = 0; xp <= 100; xp += 4) {
    const x = Math.min(W - 1, Math.round((xp / 100) * W));
    // 从 45% 往下，记录 alpha 由有到无的区间
    const segs = [];
    let on = false,
      start = 0;
    for (let y = Math.round(0.45 * H); y < Math.round(0.92 * H); y++) {
      const has = a(x, y) > 60;
      if (has && !on) { on = true; start = y; }
      if (!has && on) { on = false; segs.push([start / H * 100, (y - 1) / H * 100]); }
    }
    if (on) segs.push([start / H * 100, 92]);
    rows.push(
      'x=' + String(xp).padStart(3) + '%  ' +
        (segs.length ? segs.map(([s, e]) => s.toFixed(1) + '-' + e.toFixed(1)).join(' , ') : '（全空）')
    );
  }
  console.log(rows.join('\n'));
})();
