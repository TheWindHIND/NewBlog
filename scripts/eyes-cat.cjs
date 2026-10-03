/**
 * 芙宁娜猫猫眼睛「层次」重绘（本地精确后期，不动 AI 生成的原图轮廓）
 *
 * 思路：
 *  1. 在立绘上按颜色定位两只眼睛的虹膜可见区域，逐行取左右边界 → 得到「眼睛内腔」掩膜
 *     （掩膜不含原画的深色描边，所以原轮廓 100% 保留）
 *  2. 在掩膜内用矢量重绘：外圈加深 → 虹膜竖向渐变 → 水滴形瞳孔（描边+内渐变+高光）
 *     → 大高光 → 底部月牙反光
 *  3. 掩膜羽化后与新图层做 alpha 混合合成回原图
 *
 * 用法: node scripts/eyes-cat.cjs [输入] [输出]
 */
const sharp = require('sharp');
const fs = require('fs');

const IN = process.argv[2] || 'raw-assets/cat/aylen-full.png';
const OUT = process.argv[3] || 'raw-assets/cat/_eyes-preview.png';

// 眼睛区域（整图百分比）与配色
const EYES = [
  {
    name: 'L', // 观者左眼 = 角色右眼：亮蓝虹膜 + 深蓝水滴
    box: [0.22, 0.38, 0.45, 0.55],
    irisTop: '#2c6ad4', irisMid: '#4a97ec', irisBot: '#93d2f8',
    rim: '#132c6e', rimStart: 0.60,
    dropTop: '#4f93ee', dropBot: '#1f4fb8', dropLine: '#12295f',
    crescent: '#dff4ff', cresOp: 0.46,
    dropW: 0.40, dropTopR: -0.62, dropBotR: 0.60,
  },
  {
    name: 'R', // 观者右眼 = 角色左眼：靛紫虹膜 + 亮青水滴
    box: [0.47, 0.64, 0.43, 0.55],
    irisTop: '#6a51cb', irisMid: '#3674e2', irisBot: '#82c8f7',
    rim: '#182a80', rimStart: 0.60,
    dropTop: '#b0efff', dropBot: '#5cc8fa', dropLine: '#2a66c8',
    crescent: '#e4f8ff', cresOp: 0.46,
    dropW: 0.40, dropTopR: -0.62, dropBotR: 0.60,
  },
];

(async () => {
  const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const px = Buffer.from(data); // 会被就地修改

  const isBlue = (o) => {
    const r = px[o], g = px[o + 1], b = px[o + 2], a = px[o + 3];
    return a > 128 && b > 130 && b - r > 38 && g > 55 && b >= g - 12;
  };

  const masks = [];
  for (const eye of EYES) {
    const [x0, x1, y0, y1] = eye.box;
    const m = new Uint8Array(W * H);
    let minX = W, maxX = -1, minY = H, maxY = -1;
    for (let y = Math.round(y0 * H); y < Math.round(y1 * H); y++) {
      let f = -1, l = -1, count = 0;
      for (let x = Math.round(x0 * W); x < Math.round(x1 * W); x++) {
        if (isBlue((y * W + x) * C)) { if (f < 0) f = x; l = x; count++; }
      }
      // 只保留「成段」的行，滤掉零星噪点
      if (count >= 5 && l - f > 6) {
        for (let x = f + 2; x <= l - 2; x++) m[y * W + x] = 1;
        if (f < minX) minX = f; if (l > maxX) maxX = l;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    // 竖向填缝：把中间被高光/瞳孔切断的行补上
    for (let x = 0; x < W; x++) {
      let first = -1, last = -1;
      for (let y = minY; y <= maxY; y++) if (m[y * W + x]) { if (first < 0) first = y; last = y; }
      if (first >= 0 && last - first > 3) for (let y = first; y <= last; y++) m[y * W + x] = 1;
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2, ry = (maxY - minY) / 2;
    console.log(eye.name, 'iris px c=(' + cx.toFixed(0) + ',' + cy.toFixed(0) + ')',
      'rx=' + rx.toFixed(0), 'ry=' + ry.toFixed(0),
      '| % c=(' + (cx / W * 100).toFixed(2) + ',' + (cy / H * 100).toFixed(2) + ')',
      'rx%=' + (rx / W * 100).toFixed(2), 'ry%=' + (ry / H * 100).toFixed(2));
    masks.push({ eye, m, cx, cy, rx, ry });
  }

  // ---------- 矢量图层 ----------
  const svgParts = [];
  for (const { eye, cx, cy, rx, ry } of masks) {
    const id = eye.name;
    // 椭圆基座 + 顶端柔和收尖的水滴：最宽点回到中部（椭圆特性），顶点切线竖直但立刻外扩
    const dw = rx * eye.dropW;
    const top = cy + ry * eye.dropTopR;
    const bot = cy + ry * eye.dropBotR;
    const hh = bot - top;
    const wy = top + hh * 0.52;
    const drop =
      `M ${cx} ${top} ` +
      `C ${cx} ${top + hh * 0.18}, ${cx + dw * 0.62} ${top + hh * 0.04}, ${cx + dw} ${wy} ` +
      `C ${cx + dw} ${wy + hh * 0.38}, ${cx + dw * 0.56} ${bot}, ${cx} ${bot} ` +
      `C ${cx - dw * 0.56} ${bot}, ${cx - dw} ${wy + hh * 0.38}, ${cx - dw} ${wy} ` +
      `C ${cx - dw * 0.62} ${top + hh * 0.04}, ${cx} ${top + hh * 0.18}, ${cx} ${top} Z`;
    // 大高光（左上方小椭圆，旋转）
    const hx = cx - rx * 0.40, hy = cy - ry * 0.44;
    const hl = `<g transform="translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(-28)">
      <ellipse rx="${(rx * 0.175).toFixed(1)}" ry="${(rx * 0.10).toFixed(1)}" fill="#ffffff" opacity="0.97"/>
      <ellipse cx="${(rx * 0.15).toFixed(1)}" cy="${(ry * 0.24).toFixed(1)}" rx="${(rx * 0.07).toFixed(1)}" ry="${(rx * 0.042).toFixed(1)}" fill="#ffffff" opacity="0.68"/>
    </g>`;
    // 底部月牙反光
    const crescent = `<ellipse cx="${cx}" cy="${(cy + ry * 0.66).toFixed(1)}" rx="${(rx * 0.56).toFixed(1)}" ry="${(ry * 0.20).toFixed(1)}" fill="${eye.crescent}" opacity="${eye.cresOp}" filter="url(#soft${id})"/>`;

    svgParts.push(`
    <defs>
      <linearGradient id="iris${id}" x1="0" y1="0" x2="0.12" y2="1">
        <stop offset="0" stop-color="${eye.irisTop}"/>
        <stop offset="0.50" stop-color="${eye.irisMid}"/>
        <stop offset="1" stop-color="${eye.irisBot}"/>
      </linearGradient>
      <radialGradient id="rimg${id}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="${eye.rimStart}" stop-color="${eye.rim}" stop-opacity="0"/>
        <stop offset="0.86" stop-color="${eye.rim}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${eye.rim}" stop-opacity="0.95"/>
      </radialGradient>
      <linearGradient id="drop${id}" x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stop-color="${eye.dropTop}"/>
        <stop offset="1" stop-color="${eye.dropBot}"/>
      </linearGradient>
      <filter id="soft${id}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="${(rx * 0.10).toFixed(1)}"/>
      </filter>
    </defs>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#iris${id})"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#rimg${id})"/>
    ${crescent}
    <path d="${drop}" fill="url(#drop${id})" stroke="${eye.dropLine}" stroke-width="${(rx * 0.062).toFixed(1)}" stroke-opacity="0.92"/>
    <ellipse cx="${cx}" cy="${(cy - ry * 0.24).toFixed(1)}" rx="${(dw * 0.36).toFixed(1)}" ry="${(ry * 0.20).toFixed(1)}" fill="#ffffff" opacity="0.24" filter="url(#soft${id})"/>
    ${hl}`);
  }
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgParts.join('')}</svg>`;
  const art = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();

  // ---------- 合成（掩膜羽化 alpha 混合） ----------
  const aMask = new Uint8Array(W * H);
  for (const { m } of masks) for (let i = 0; i < W * H; i++) if (m[i]) aMask[i] = 255;
  // 手动 3x3 两轮箱式模糊做羽化（sharp 单通道 blur 会转成 3 通道，不便取回）
  const box = (src) => {
    const dst = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= W) continue;
            s += src[yy * W + xx]; n++;
          }
        }
        dst[y * W + x] = Math.round(s / n);
      }
    }
    return dst;
  };
  const soft = box(box(aMask));

  let touched = 0;
  for (let i = 0; i < W * H; i++) {
    const a = soft[i];
    if (!a) continue;
    touched++;
    const o = i * C, w = a / 255;
    for (let c = 0; c < 3; c++) {
      const nv = art[o + c], ov = px[o + c];
      px[o + c] = Math.round(nv * w + ov * (1 - w));
    }
  }
  console.log('blended px', touched);

  await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
  fs.writeFileSync('raw-assets/cat/aylen-full-eyes.png', await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
  console.log('→', OUT, '& raw-assets/cat/aylen-full-eyes.png');
})();
