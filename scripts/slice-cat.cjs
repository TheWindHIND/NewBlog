/**
 * 芙宁娜猫猫 live2d 图层切分
 * 输入: public/images/cat/aylen-full.png (已抠透明、已裁边)
 * 输出: head.webp / body.webp / tail.webp  +  _rig-test*.png 调试图
 *
 * 坐标全部用「整图宽高的百分比」标定，方便对着 _debug-grid.png 微调。
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IN = 'raw-assets/cat/aylen-full.png';
const CLOSED_IN = 'raw-assets/cat/aylen-full-closed.png';
const OUT = 'public/images/cat';
const DBG = 'raw-assets/cat';

// —— 标定参数（百分比） ——
const HEAD_BOTTOM = 47.5;   // 头部图层下边界（领口处）
const BODY_TOP = 44.5;      // 身体图层上边界（略高于头切，做出重叠避免缝隙）
const FEATHER = 2.5;        // 头部下沿羽化像素

// 尾巴遮罩多边形：沿「裙子右轮廓 → 尾巴外缘」走一圈，把尾巴从身体图层里挖出来
const TAIL_POLY = [
  [73.5, 36], [77, 44], [87, 51], [88, 62], [80, 67],
  [70.5, 72.5], [79, 81], [89, 87], [99, 92], [100.5, 97],
  [100.5, 34],
];
// 尾巴旋转轴心（裙子与尾巴的交界处）
const TAIL_PIVOT = [74, 76.5];
// 身体挖洞用的多边形：把 TAIL_POLY 整体向右外扩，保证挖洞略小于尾巴，接缝不露背景
const TAIL_GROW = 2.2;

const pct = (p, total) => Math.round((p / 100) * total);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(DBG, { recursive: true });
  const base = sharp(IN);
  const meta = await base.metadata();
  const W = meta.width, H = meta.height;
  console.log('source', `${W}x${H}`);

  const targetW = 760;
  const scale = Math.min(1, targetW / W);
  const w = Math.round(W * scale), h = Math.round(H * scale);

  const img = await sharp(IN).resize(w, h, { fit: 'fill' }).png().toBuffer();
  const srcMeta = await sharp(img).metadata();
  const IW = srcMeta.width, IH = srcMeta.height;

  const svgPoly = (pts, extra = 0) =>
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${FEATHER / 2}"/></filter></defs>` +
    `<polygon points="${pts.map(([x, y]) => `${pct(x + extra, IW)},${pct(y, IH)}`).join(' ')}" fill="#fff" filter="url(#f)"/></svg>`;

  // ---------- 头部图层：整图取上半段，下沿羽化 ----------
  const headMaskSvg =
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="fb" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${FEATHER}"/></filter></defs>` +
    `<rect x="${-FEATHER * 3}" y="${-FEATHER * 3}" width="${IW + FEATHER * 6}" ` +
    `height="${pct(HEAD_BOTTOM, IH) + FEATHER * 2}" fill="#fff" filter="url(#fb)"/></svg>`;
  const headMask = await sharp(Buffer.from(headMaskSvg)).png().toBuffer();
  const head = await sharp(img)
    .composite([{ input: headMask, blend: 'dest-in' }])
    .png().toBuffer();

  // ---------- 闭眼版头部图层（与睁眼版严格对齐，用于交叉淡入眨眼） ----------
  let headClosed = null;
  if (fs.existsSync(CLOSED_IN)) {
    const imgClosed = await sharp(CLOSED_IN).resize(w, h, { fit: 'fill' }).png().toBuffer();
    headClosed = await sharp(imgClosed)
      .composite([{ input: headMask, blend: 'dest-in' }])
      .png().toBuffer();
  }

  // ---------- 尾巴图层 ----------
  const tailMask = await sharp(Buffer.from(svgPoly(TAIL_POLY))).png().toBuffer();
  const tail = await sharp(img)
    .composite([{ input: tailMask, blend: 'dest-in' }])
    .png().toBuffer();

  // ---------- 身体图层：从 BODY_TOP 起，挖掉尾巴 ----------
  const bodyTopMaskSvg =
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="fb2" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${FEATHER}"/></filter></defs>` +
    `<rect x="${-FEATHER * 3}" y="${pct(BODY_TOP, IH) - FEATHER * 2}" width="${IW + FEATHER * 6}" ` +
    `height="${IH}" fill="#fff" filter="url(#fb2)"/></svg>`;
  const bodyTopMask = await sharp(Buffer.from(bodyTopMaskSvg)).png().toBuffer();
  const bodyCut = await sharp(Buffer.from(svgPoly(TAIL_POLY, TAIL_GROW))).png().toBuffer();
  const body = await sharp(img)
    .composite([
      { input: bodyTopMask, blend: 'dest-in' },
      { input: bodyCut, blend: 'dest-out' },
    ])
    .png().toBuffer();

  // ---------- 输出 ----------
  const save = async (buf, name, q = 90) => {
    const p = path.join(OUT, name);
    const out = await sharp(buf).webp({ quality: q, alphaQuality: 100 }).toBuffer();
    fs.writeFileSync(p, out);
    console.log(name.padEnd(14), `${IW}x${IH}`, Math.round(out.length / 1024) + 'KB');
  };
  await save(head, 'aylen-head.webp');
  if (headClosed) await save(headClosed, 'aylen-head-closed.webp');
  await save(body, 'aylen-body.webp');
  await save(tail, 'aylen-tail.webp');

  // ---------- 调试图：叠加验证接缝 ----------
  const bgLight = { r: 247, g: 243, b: 232, alpha: 1 };
  const bgDark = { r: 11, g: 21, b: 38, alpha: 1 };

  // 绕「轴心」旋转的近似：以轴心为中心裁一块画布 → 旋转 → 再贴回，避免 sharp.rotate 绕图心的偏移
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
    // 旋转后中心相对原 piece 中心的偏移 → 换算回画布坐标
    return {
      buf: rotated,
      left: bx0 + Math.round(bw / 2 - rm.width / 2),
      top: by0 + Math.round(bh / 2 - rm.height / 2),
    };
  }

  async function rig(bg, deg, name) {
    const cx = pct(TAIL_PIVOT[0], IW), cy = pct(TAIL_PIVOT[1], IH);
    const PAD = 120;
    const CW = IW + PAD * 2, CH = IH + PAD * 2;
    let tailLayer;
    if (deg === 0) {
      tailLayer = { buf: tail, left: PAD, top: PAD };
    } else {
      const r = await rotateAbout(tail, deg, cx, cy);
      tailLayer = { buf: r.buf, left: r.left + PAD, top: r.top + PAD };
    }
    const composed = await sharp({
      create: { width: CW, height: CH, channels: 4, background: bg },
    })
      .composite([
        { input: body, top: PAD, left: PAD },
        { input: tailLayer.buf, top: tailLayer.top, left: tailLayer.left },
        { input: head, top: PAD, left: PAD },
      ])
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(DBG, name), composed);
    console.log('rig test →', name, `(tail ${deg}°)`);
  }
  await rig(bgLight, 0, '_rig-rest.png');
  await rig(bgDark, 12, '_rig-wag.png');
})();
