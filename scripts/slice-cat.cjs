/**
 * 芙宁娜猫猫 live2d 图层切分（Q 版水手服版）
 * 输入: raw-assets/cat/aylen-full-hat.png（已抠透明、已裁边） / aylen-closed-hat.png
 * 输出: public/images/cat/aylen-{head,head-closed,body,tail}.webp + 调试图
 *
 * 坐标全部用「整图宽高的百分比」标定，对着 raw-assets/cat/_grid.png（见 scripts/_grid.cjs）微调。
 *
 * v2（2026-10-03 晚）修两个「动起来就露馅」的问题：
 *  1) 头部：切割线原来是一条横线（59.5%）且带 ±0.7% 羽化 —— 正好压在下巴的深色轮廓上，
 *     头一动就把下巴轮廓拖出一道「第二层下巴」。现改为**颈部折线**：切在 61.8~63% 的平坦颈肉上，
 *     且枢轴（CSS 里 transform-origin 50% 62%）就落在这条线上 → 竖直方向几乎不再扫动。
 *     身体上沿比切线再高 3% 作为余量，保证头抬起时不露空。
 *  2) 尾巴：原来的 TAIL_POLY 位置偏了约 6%（偏上偏左），尾巴图层几乎切空 ——
 *     于是「动的只是一小块碎片，身体上还留着静止的尾巴」＝割裂。
 *     现按网格重新标定，并且把尾巴**画在身体之上**（不再靠身体挖洞露出来，
 *     挖洞会让旋转中的尾巴被身体边缘切掉），挖洞与尾巴遮罩用同一个**外扩**多边形，
 *     静止时像素完全一致，摆动时也不会露缝。
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IN = 'raw-assets/cat/aylen-full-hat.png';
const CLOSED_IN = 'raw-assets/cat/aylen-closed-hat.png';
const OUT = 'public/images/cat';
const DBG = 'raw-assets/cat';

// —— 头部切割线（百分比）：中间压在平坦颈部，两侧放进头发里 ——
const HEAD_CUT = [
  [0, 63.0], [10, 62.5], [18, 63.0], [26, 63.0], [34, 62.4], [42, 62.2],
  [50, 62.0], [58, 61.8], [66, 61.9], [74, 62.3], [82, 62.9], [90, 63.3], [100, 63.4],
];
/** 身体上沿比切线高这么多（%），作为「头动起来」时的遮挡余量 */
const BODY_OVERLAP = 3.0;
/** 头部图层底边的羽化（像素，作用在 760 宽的图上） */
const HEAD_FEATHER = 1.4;

// —— 尾巴轮廓（百分比，顺时针：先外缘从尾尖到根部，再内缘沿身体侧回去）——
// ⚠️ 坐标是用 scripts/_probe-tail.cjs 逐行扫描量出来的（每一行尾巴可见白色的左右边界）：
//    内缘必须绕开**手指**（y79~82% 处手占 x68.2~76.2），外缘要贴到尾巴真实宽度
//    （y74~81% 处可到 x≈91%）。手绘估算的多边形会把手指圈进来 → 手指跟着尾巴飞 = 割裂。
const TAIL_POLY = [
  // 尾尖（上端）
  [78.3, 67.4], [77.9, 66.2], [79.4, 65.4], [81.4, 65.4], [83.5, 66.0],
  // 外缘（右侧一路下来）
  [85.0, 67.0], [86.6, 68.2], [87.7, 69.4], [89.3, 70.8], [90.0, 71.8],
  [90.8, 72.8], [90.9, 74.0], [90.8, 75.0], [90.5, 76.2], [90.8, 77.4],
  [90.0, 78.8], [89.2, 79.6], [91.3, 80.6], [91.1, 81.7], [90.8, 82.6],
  [89.4, 83.5], [89.2, 84.5], [89.8, 85.6],
  // 底缘（含蝴蝶结垂下的飘带，到 y≈87.6%）
  [87.6, 86.6], [84.0, 87.2], [79.0, 87.5], [74.0, 87.6], [68.8, 87.0],
  // 内缘（自下而上，贴着裙摆外沿 → 手指外沿 → 尾尖）
  [69.6, 85.4], [70.3, 84.5], [72.2, 83.3], [74.4, 82.3], [77.2, 81.3],
  [78.4, 80.2], [78.2, 79.2], [78.9, 78.2], [79.4, 77.2], [81.0, 76.2],
  [81.0, 75.2], [80.8, 74.2], [80.9, 73.2], [80.1, 72.2], [79.3, 71.2],
  [77.6, 70.2], [76.6, 69.1], [76.4, 68.0], [76.7, 67.2],
];
/** 尾巴旋转轴心（尾巴可见根部 —— 放在这里，旋转时根部几乎不动，不会与裙摆脱开） */
const TAIL_PIVOT = [70.5, 85.5];
/**
 * 尾巴遮罩外扩（像素）：只补抗锯齿的 1px，**绝不能往根部加余量** ——
 * 根部的余量会把手/袖口/裙摆的像素圈进尾巴层，一旋转就跟着飞走（＝割裂的真凶）。
 */
const TAIL_MARGIN = 1.0;

const pct = (p, total) => Math.round((p / 100) * total);

/** 点是否在多边形内（射线法） */
function inside(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** 顶点沿外法线外扩（外法线方向靠「往内/往外试一步」判定） */
function offsetPoly(pts, marginOf) {
  const n = pts.length;
  const unit = (v) => {
    const l = Math.hypot(v[0], v[1]) || 1;
    return [v[0] / l, v[1] / l];
  };
  return pts.map(([x, y], i) => {
    const p = pts[(i - 1 + n) % n];
    const q = pts[(i + 1) % n];
    const t = unit([q[0] - p[0], q[1] - p[1]]);
    let nx = -t[1];
    let ny = t[0];
    // 试探 0.6% 看哪边在里面
    const step = 0.6;
    if (inside(pts, x + nx * step, y + ny * step)) {
      nx = -nx;
      ny = -ny;
    }
    const m = marginOf(x);
    const scale = m / 100; // margin 是整图宽度百分比
    return [x + nx * scale, y + ny * scale];
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(DBG, { recursive: true });
  const meta = await sharp(IN).metadata();
  const W = meta.width;
  const scale = Math.min(1, 760 / W);
  const w = Math.round(W * scale);
  const h = Math.round(meta.height * scale);

  const img = await sharp(IN).resize(w, h, { fit: 'fill' }).png().toBuffer();
  const srcMeta = await sharp(img).metadata();
  const IW = srcMeta.width;
  const IH = srcMeta.height;
  console.log('source', `${W}x${meta.height}`, '→', `${IW}x${IH}`);

  const PAD = 60;

  /** 把「一条折线之上 / 之下」的区域做成遮罩 */
  const cutPoly = (line, side, feather) => {
    const pts = [];
    if (side === 'above') {
      pts.push([-PAD, -PAD], [-PAD, pct(line[0][1], IH)]);
      for (const [x, y] of line) pts.push([pct(x, IW), pct(y, IH)]);
      pts.push([IW + PAD, pct(line[line.length - 1][1], IH)], [IW + PAD, -PAD]);
    } else {
      pts.push([-PAD, IH + PAD], [-PAD, pct(line[0][1], IH)]);
      for (const [x, y] of line) pts.push([pct(x, IW), pct(y, IH)]);
      pts.push([IW + PAD, pct(line[line.length - 1][1], IH)], [IW + PAD, IH + PAD]);
    }
    return (
      `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><filter id="f" x="-25%" y="-25%" width="150%" height="150%">` +
      `<feGaussianBlur stdDeviation="${feather}"/></filter></defs>` +
      `<polygon points="${pts.map(([x, y]) => `${x},${y}`).join(' ')}" fill="#fff" filter="url(#f)"/></svg>`
    );
  };

  const polySVG = (pts, feather = 0) =>
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    (feather
      ? `<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%">` +
        `<feGaussianBlur stdDeviation="${feather}"/></filter></defs>`
      : '') +
    `<polygon points="${pts.map(([x, y]) => `${pct(x, IW)},${pct(y, IH)}`).join(' ')}" fill="#fff"` +
    (feather ? ' filter="url(#f)"' : '') +
    `/></svg>`;

  const TAIL_OUT = offsetPoly(TAIL_POLY, () => TAIL_MARGIN);

  /**
   * 把遮罩「沿着深色线稿」向外生长若干轮。
   *
   * 为什么需要：手绘多边形是折线，压不住尾巴的曲线描边 —— 折线外侧会残留几像素
   * 尾巴轮廓在**身体层**里，尾巴一转就露出这些静止的黑色碎片（还是「割裂」）。
   * 生长规则：只吃「深色线稿」或「透明背景」的像素，碰到皮肤/毛发/衣料就停；
   * 再加一条保护：挨着皮肤的深色像素不吃（那是手的描边，不能带走）。
   */
  const growMaskIntoInk = async (maskPNG, rounds) => {
    const { data: md, info: mi } = await sharp(maskPNG).raw().toBuffer({ resolveWithObject: true });
    const mw = mi.width;
    const mh = mi.height;
    const { data: sd, info: si } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sc = si.channels;

    const isDark = (i) => {
      const p = i * sc;
      const a = sd[p + 3];
      if (a < 40) return true; // 透明：可以吃（吃进来也是空的，无害）
      if (a < 160) return false; // 半透明边缘：别动
      const lum = 0.299 * sd[p] + 0.587 * sd[p + 1] + 0.114 * sd[p + 2];
      if (lum >= 150) return false;
      // 挨着皮肤就不吃（保住手指/手的描边）
      const x = i % mw;
      const y = (i - x) / mw;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
          const q = (ny * mw + nx) * sc;
          const r = sd[q], g = sd[q + 1], b = sd[q + 2], a2 = sd[q + 3];
          if (a2 < 200) continue;
          if (r > g && g > b && r - b > 25 && r > 150) return false; // 皮肤
        }
      }
      return true;
    };

    let mask = new Uint8Array(mw * mh);
    for (let i = 0; i < mask.length; i++) mask[i] = md[i * mi.channels] > 128 ? 1 : 0;

    for (let r = 0; r < rounds; r++) {
      const next = Uint8Array.from(mask);
      for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
          const i = y * mw + x;
          if (mask[i]) continue;
          const near =
            (x > 0 && mask[i - 1]) ||
            (x < mw - 1 && mask[i + 1]) ||
            (y > 0 && mask[i - mw]) ||
            (y < mh - 1 && mask[i + mw]);
          if (near && isDark(i)) next[i] = 1;
        }
      }
      mask = next;
    }

    const rgba = Buffer.alloc(mw * mh * 4);
    for (let i = 0; i < mask.length; i++) {
      const v = mask[i] ? 255 : 0;
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
    return sharp(rgba, { raw: { width: mw, height: mh, channels: 4 } }).png().toBuffer();
  };

  const headMask = await sharp(Buffer.from(cutPoly(HEAD_CUT, 'above', HEAD_FEATHER))).png().toBuffer();
  const bodyMask = await sharp(
    Buffer.from(
      cutPoly(
        HEAD_CUT.map(([x, y]) => [x, y - BODY_OVERLAP]),
        'below',
        HEAD_FEATHER
      )
    )
  ).png().toBuffer();
  const rawTailMask = await sharp(Buffer.from(polySVG(TAIL_OUT, 0.8))).png().toBuffer();
  // 再沿线稿生长 6 轮：把尾巴自己的描边整条吃进遮罩，身体层才不留静止的黑色残片
  const tailMask = await growMaskIntoInk(rawTailMask, 6);

  // ---------- 头部：切线以上，且挖掉尾巴 ----------
  const head = await sharp(img)
    .composite([{ input: headMask, blend: 'dest-in' }, { input: tailMask, blend: 'dest-out' }])
    .png()
    .toBuffer();

  let headClosed = null;
  if (fs.existsSync(CLOSED_IN)) {
    const imgClosed = await sharp(CLOSED_IN).resize(w, h, { fit: 'fill' }).png().toBuffer();
    headClosed = await sharp(imgClosed)
      .composite([{ input: headMask, blend: 'dest-in' }, { input: tailMask, blend: 'dest-out' }])
      .png()
      .toBuffer();
  }

  // ---------- 尾巴：外扩多边形（多留一圈边缘像素做余量） ----------
  const tail = await sharp(img)
    .composite([{ input: tailMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // ---------- 身体：切线以下（上沿留余量），挖掉尾巴（同一个外扩多边形） ----------
  const body = await sharp(img)
    .composite([{ input: bodyMask, blend: 'dest-in' }, { input: tailMask, blend: 'dest-out' }])
    .png()
    .toBuffer();

  // ---------- 输出 ----------
  const save = async (buf, name, q = 90) => {
    const out = await sharp(buf).webp({ quality: q, alphaQuality: 100 }).toBuffer();
    fs.writeFileSync(path.join(OUT, name), out);
    console.log(name.padEnd(22), `${IW}x${IH}`, Math.round(out.length / 1024) + 'KB');
  };
  await save(head, 'aylen-head.webp');
  if (headClosed) await save(headClosed, 'aylen-head-closed.webp');
  await save(body, 'aylen-body.webp');
  await save(tail, 'aylen-tail.webp');

  // ---------- 调试图 ----------
  const bgLight = { r: 247, g: 243, b: 232, alpha: 1 };
  const bgDark = { r: 11, g: 21, b: 38, alpha: 1 };

  async function rotateAbout(buf, deg, cx, cy) {
    const pad = 60;
    const bx0 = Math.max(0, Math.round(cx - (IW - cx) - pad));
    const by0 = Math.max(0, Math.round(cy - (IH - cy) - pad));
    const bw = Math.min(IW, Math.round(cx + (IW - cx) + pad)) - bx0;
    const bh = Math.min(IH, Math.round(cy + (IH - cy) + pad)) - by0;
    const piece = await sharp(buf).extract({ left: bx0, top: by0, width: bw, height: bh }).toBuffer();
    const rotated = await sharp(piece)
      .rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const rm = await sharp(rotated).metadata();
    return { buf: rotated, left: bx0 + Math.round(bw / 2 - rm.width / 2), top: by0 + Math.round(bh / 2 - rm.height / 2) };
  }

  const cx = pct(TAIL_PIVOT[0], IW);
  const cy = pct(TAIL_PIVOT[1], IH);

  async function rig(bg, headDy, tailDeg, name, box) {
    const CW = IW + PAD * 2;
    const CH = IH + PAD * 2;
    let tailLayer;
    if (tailDeg === 0) {
      tailLayer = { buf: tail, left: PAD, top: PAD };
    } else {
      const r = await rotateAbout(tail, tailDeg, cx, cy);
      tailLayer = { buf: r.buf, left: r.left + PAD, top: r.top + PAD };
    }
    const composed = await sharp({ create: { width: CW, height: CH, channels: 4, background: bg } })
      .composite([
        { input: body, top: PAD, left: PAD },
        { input: tailLayer.buf, top: tailLayer.top, left: tailLayer.left },
        { input: head, top: PAD + Math.round(headDy), left: PAD },
      ])
      .png()
      .toBuffer();
    if (box) {
      await sharp(composed).extract(box).resize({ width: 900 }).png().toFile(path.join(DBG, name));
    } else {
      fs.writeFileSync(path.join(DBG, name), composed);
    }
    console.log('rig →', name, `(head ${headDy}px, tail ${tailDeg}°)`);
  }

  const neckBox = { left: PAD + 60, top: PAD + 620, width: 480, height: 360 };
  const tailBox = { left: PAD + 380, top: PAD + 700, width: 380, height: 340 };
  await rig(bgLight, 0, 0, '_rig-rest.png');
  await rig(bgLight, -Math.round(IH * 0.008), 0, '_rig-neck-up.png', neckBox);
  await rig(bgLight, Math.round(IH * 0.008), 0, '_rig-neck-down.png', neckBox);
  await rig(bgLight, 0, 8.5, '_rig-wag.png', tailBox);
  await rig(bgLight, 0, -8.5, '_rig-wag-back.png', tailBox);
  await rig(bgLight, 0, 4, '_rig-wag-slow.png', tailBox);
  await rig(bgDark, 0, 0, '_rig-rest-dark.png');
})();
