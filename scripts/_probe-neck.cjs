/** 打印中心列的颜色取样，用来判定「下巴轮廓 / 脖子皮肤 / 领口」的分界 */
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
  const px = (x, y) => {
    const i = (y * W + x) * ch;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const name = (p) => {
    const [r, g, b, a] = p;
    if (a < 40) return '空';
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    if (l < 90) return '深色线';
    if (b > r + 25 && b > 120) return '蓝';
    if (r > 200 && g > 180 && b > 160 && r - b < 45) return '肤';
    if (l > 215) return '白';
    return '中';
  };
  for (const xp of [50, 42, 58]) {
    const x = Math.round((xp / 100) * W);
    const parts = [];
    let cur = null;
    let start = 0;
    for (let y = Math.round(0.45 * H); y < Math.round(0.80 * H); y++) {
      const n = name(px(x, y));
      if (n !== cur) {
        if (cur) parts.push(cur + ' ' + (start / H * 100).toFixed(1) + '-' + (y / H * 100).toFixed(1) + '%');
        cur = n;
        start = y;
      }
    }
    parts.push(cur + ' ' + (start / H * 100).toFixed(1) + '-80.0%');
    console.log('x=' + xp + '%:');
    for (const p of parts) console.log('   ' + p);
  }
})();
