// 诊断：尾巴遮罩 PNG 编码往返后，各通道的取值分布
const sharp = require('sharp');
const pct = (p, total) => Math.round((p / 100) * total);
const TAIL_POLY = [
  [78.3, 67.4], [77.9, 66.2], [79.4, 65.4], [81.4, 65.4], [83.5, 66.0],
  [85.0, 67.0], [86.6, 68.2], [87.7, 69.4], [89.3, 70.8], [90.0, 71.8],
  [90.8, 72.8], [90.9, 74.0], [90.8, 75.0], [90.5, 76.2], [90.8, 77.4],
  [90.0, 78.8], [89.2, 79.6], [91.3, 80.6], [91.1, 81.7], [90.8, 82.6],
  [89.4, 83.5], [89.2, 84.5], [89.8, 85.6],
  [87.6, 86.6], [84.0, 87.2], [79.0, 87.5], [74.0, 87.6], [68.8, 87.0],
  [69.6, 85.4], [70.3, 84.5], [72.2, 83.3], [74.4, 82.3], [77.2, 81.3],
  [78.4, 80.2], [78.2, 79.2], [78.9, 78.2], [79.4, 77.2], [81.0, 76.2],
  [81.0, 75.2], [80.8, 74.2], [80.9, 73.2], [80.1, 72.2], [79.3, 71.2],
  [77.6, 70.2], [76.6, 69.1], [76.4, 68.0], [76.7, 67.2],
];
(async () => {
  const IW = 760, IH = 1247;
  const svg =
    '<svg width="' + IW + '" height="' + IH + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.8"/></filter></defs>' +
    '<polygon points="' + TAIL_POLY.map((p) => pct(p[0], IW) + ',' + pct(p[1], IH)).join(' ') + '" fill="#fff" filter="url(#f)"/></svg>';
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const c = info.channels;
  const total = info.width * info.height;
  let rOn = 0, aOn = 0, bothOn = 0;
  for (let i = 0; i < total; i++) {
    const r = data[i * c] > 128;
    const a = c >= 4 && data[i * c + 3] > 128;
    if (r) rOn++;
    if (a) aOn++;
    if (r && a) bothOn++;
  }
  console.log('PNG round-trip: channels=' + c +
    '  R>128: ' + (100 * rOn / total).toFixed(1) + '%' +
    '  A>128: ' + (100 * aOn / total).toFixed(1) + '%' +
    '  R&A: ' + (100 * bothOn / total).toFixed(1) + '%');
  const samples = [];
  for (let i = 0; i < total && samples.length < 3; i++) {
    if (data[i * c + 3] === 0) samples.push([data[i * c], data[i * c + 1], data[i * c + 2]]);
  }
  console.log('transparent pixel RGB samples:', JSON.stringify(samples));
})();
