/**
 * 芙宁娜猫猫 live2d 图层切分（Q 版水手服版）
 * 输入: raw-assets/cat/aylen-full.png（已抠透明、已裁边；可选 aylen-full-closed.png）
 * 输出: public/images/cat/aylen-{head,head-closed,body,tail}.webp + 调试图
 *
 * 坐标全部用「整图宽高的百分比」标定，对着 raw-assets/cat/_debug-grid.png 微调。
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IN = 'raw-assets/cat/aylen-full-hat.png';
const CLOSED_IN = 'raw-assets/cat/aylen-closed-hat.png';
const OUT = 'public/images/cat';
const DBG = 'raw-assets/cat';

// —— 标定参数（百分比） ——
// Q 版：头极大，下巴约 58%，水手领约 62%；头部下切取在脖子处
const HEAD_BOTTOM = 59.5;
const BODY_TOP = 58.0;
const FEATHER = 3;

// 尾巴遮罩多边形（顺时针）：沿尾巴外缘走一圈，再沿「身体右缘」回到根部
const TAIL_POLY = [
  [73.5, 60.2], [76.3, 59.7], [79.6, 60.4], [82.8, 62.2], [86.4, 64.8],
  [87.8, 68.2], [86.6, 71.8], [83.8, 75.2], [79.8, 77.6], [75.0, 79.0],
  [70.0, 78.8], [66.2, 78.2],
  [66.6, 76.4], [70.5, 76.0], [73.5, 75.6], [75.4, 73.9], [76.4, 71.2],
  [76.5, 68.4], [75.7, 65.6], [74.7, 63.0], [74.0, 61.4],
];
// 尾巴旋转轴心（尾巴与裙子交界处）
const TAIL_PIVOT = [70, 75.5];
// 身体挖洞：把 TAIL_POLY 整体向右缩进，使挖洞略小于尾巴 → 接缝处不露背景
const TAIL_INSET = 2.6;

const pct = (p, total) => Math.round((p / 100) * total);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(DBG, { recursive: true });
  const meta = await sharp(IN).metadata();
  const W = meta.width, H = meta.height;
  console.log('source', `${W}x${H}`);

  const targetW = 760;
  const scale = Math.min(1, targetW / W);
  const w = Math.round(W * scale), h = Math.round(H * scale);

  const img = await sharp(IN).resize(w, h, { fit: 'fill' }).png().toBuffer();
  const srcMeta = await sharp(img).metadata();
  const IW = srcMeta.width, IH = srcMeta.height;
  console.log('resized', `${IW}x${IH}`);

  const svgPoly = (pts, inset = 0) =>
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${FEATHER / 2}"/></filter></defs>` +
    `<polygon points="${pts
      .map(([x, y], i) => `${pct(x + (i < 12 ? 0 : inset), IW)},${pct(y, IH)}`)
      .join(' ')}" fill="#fff" filter="url(#f)"/></svg>`;

  const tailMask = await sharp(Buffer.from(svgPoly(TAIL_POLY))).png().toBuffer();

  // ---------- 头部图层：整图取上半段，下沿羽化，并挖掉尾巴 ----------
  const headMaskSvg =
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="fb" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${FEATHER}"/></filter></defs>` +
    `<rect x="${-FEATHER * 3}" y="${-FEATHER * 3}" width="${IW + FEATHER * 6}" ` +
    `height="${pct(HEAD_BOTTOM, IH) + FEATHER * 2}" fill="#fff" filter="url(#fb)"/></svg>`;
  const headMask = await sharp(Buffer.from(headMaskSvg)).png().toBuffer();
  const head = await sharp(img)
    .composite([
      { input: headMask, blend: 'dest-in' },
      { input: tailMask, blend: 'dest-out' },
    ])
    .png().toBuffer();

  // ---------- 闭眼版头部（与睁眼版严格对齐） ----------
  let headClosed = null;
  if (fs.existsSync(CLOSED_IN)) {
    const imgClosed = await sharp(CLOSED_IN).resize(w, h, { fit: 'fill' }).png().toBuffer();
    headClosed = await sharp(imgClosed)
      .composite([
        { input: headMask, blend: 'dest-in' },
        { input: tailMask, blend: 'dest-out' },
      ])
      .png().toBuffer();
  }

  // ---------- 尾巴图层 ----------
  const tail = await sharp(img)
    .composite([{ input: tailMask, blend: 'dest-in' }])
    .png().toBuffer();

  // ---------- 身体图层：从 BODY_TOP 起，挖掉尾巴（挖洞略小） ----------
  const bodyTopMaskSvg =
    `<svg width="${IW}" height="${IH}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="fb2" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${FEATHER}"/></filter></defs>` +
    `<rect x="${-FEATHER * 3}" y="${pct(BODY_TOP, IH) - FEATHER * 2}" width="${IW + FEATHER * 6}" ` +
    `height="${IH}" fill="#fff" filter="url(#fb2)"/></svg>`;
  const bodyTopMask = await sharp(Buffer.from(bodyTopMaskSvg)).png().toBuffer();
  const bodyCut = await sharp(Buffer.from(svgPoly(TAIL_POLY, TAIL_INSET))).png().toBuffer();
  const body = await sharp(img)
    .composite([
      { input: bodyTopMask, blend: 'dest-in' },
      { input: bodyCut, blend: 'dest-out' },
    ])
    .png().toBuffer();

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
        { input: tailLayer.buf, top: tailLayer.top, left: tailLayer.left },
        { input: body, top: PAD, left: PAD },
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
