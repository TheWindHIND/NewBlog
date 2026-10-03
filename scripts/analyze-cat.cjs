/**
 * 分析抠图后的立绘：找出 alpha 连通域，报告包围盒与质心（百分比）
 * 用于判断「尾巴」是否与身体分离，并据此精确切层
 */
const sharp = require('sharp');

const IN = process.argv[2] || 'raw-assets/cat/aylen-full.png';
const A_MIN = Number(process.argv[3] || 128); // 连通阈值，过滤抗锯齿细桥

(async () => {
  const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const labels = new Int32Array(W * H).fill(-1);
  const comps = [];
  const idx = (x, y) => y * W + x;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      if (labels[i] !== -1) continue;
      if (data[i * 4 + 3] < A_MIN) { labels[i] = -2; continue; }
      const id = comps.length;
      const stack = [i];
      labels[i] = id;
      let area = 0, minX = W, minY = H, maxX = -1, maxY = -1, sx = 0, sy = 0;
      while (stack.length) {
        const p = stack.pop();
        const px = p % W, py = (p - px) / W;
        area++; sx += px; sy += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let k = 0; k < 4; k++) {
          const nx = px + nb[k][0], ny = py + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = idx(nx, ny);
          if (labels[q] !== -1) continue;
          if (data[q * 4 + 3] < A_MIN) { labels[q] = -2; continue; }
          labels[q] = id;
          stack.push(q);
        }
      }
      comps.push({ id, area, minX, minY, maxX, maxY, cx: sx / area, cy: sy / area });
    }
  }
  comps.sort((a, b) => b.area - a.area);
  const p = (v, t) => ((v / t) * 100).toFixed(1);
  console.log(`size ${W}x${H}  threshold ${A_MIN}  components ${comps.length}`);
  for (const c of comps.slice(0, 8)) {
    console.log(
      `#${c.id}  area=${c.area}  ` +
      `bbox=[${p(c.minX, W)},${p(c.minY, H)} .. ${p(c.maxX, W)},${p(c.maxY, H)}]  ` +
      `centroid=(${p(c.cx, W)},${p(c.cy, H)})`
    );
  }
})();
