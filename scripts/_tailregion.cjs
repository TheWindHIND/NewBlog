/**
 * 尾巴区域自动提取（洪水填充）
 *
 * 手绘多边形总会切进「手指 / 袖口 / 裙摆」——那些像素被算进尾巴层后，
 * 一旋转就跟着飞走 → 看起来就是「尾巴割裂」。
 *
 * 线稿（深色描边）天然把尾巴和手、裙摆隔开，所以：
 *   1. 以尾巴内部一点为种子，在「非深色描边、且不透明」的区域做 4 邻域洪水填充；
 *   2. 结果向外膨胀 2px，把尾巴自己的描边和抗锯齿边一并吞进来
 *      （否则描边会残留在身体层里，尾巴一动就露出「一条静止的尾巴轮廓」）；
 *   3. 输出成和原图同尺寸的遮罩 PNG（白=尾巴）。
 *
 * CLI：node scripts/_tailregion.cjs   → raw-assets/cat/_chk-tailregion.png（描边叠加图）
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const P = (p) => path.join(__dirname, '..', p);

const SEED = [0.82, 0.76];   // 尾巴内部的种子点（归一化）
const DARK = 118;            // 亮度低于此值视为线稿，作为填充屏障
const ALPHA_MIN = 40;        // 透明度低于此值视为背景，作为屏障
const DILATE = 2;            // 膨胀半径（像素）

/** 生成尾巴掩码，返回 { mask: Buffer(svg), region: Uint8Array, W, H } */
async function tailRegion(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;

  const blocked = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += channels) {
    const r = data[p], g = data[p + 1], b = data[p + 2], a = data[p + 3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // 只在「不透明」的像素里走；深色线稿也挡住（但透明像素本身也要挡住，否则会漏到画布外）
    blocked[i] = a < ALPHA_MIN || lum < DARK ? 1 : 0;
  }

  const sx = Math.round(SEED[0] * W);
  const sy = Math.round(SEED[1] * H);
  if (blocked[sy * W + sx]) throw new Error(`种子点落在屏障像素上：(${sx},${sy})`);

  const region = new Uint8Array(W * H);
  const stack = [sy * W + sx];
  region[sy * W + sx] = 1;
  while (stack.length) {
    const idx = stack.pop();
    const x = idx % W;
    const y = (idx - x) / W;
    if (x > 0 && !blocked[idx - 1] && !region[idx - 1]) { region[idx - 1] = 1; stack.push(idx - 1); }
    if (x < W - 1 && !blocked[idx + 1] && !region[idx + 1]) { region[idx + 1] = 1; stack.push(idx + 1); }
    if (y > 0 && !blocked[idx - W] && !region[idx - W]) { region[idx - W] = 1; stack.push(idx - W); }
    if (y < H - 1 && !blocked[idx + W] && !region[idx + W]) { region[idx + W] = 1; stack.push(idx + W); }
  }

  // 膨胀（方形结构元，视觉上足够）
  let grown = region;
  for (let k = 0; k < DILATE; k++) {
    const next = Uint8Array.from(grown);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (grown[i]) continue;
        if (
          (x > 0 && grown[i - 1]) ||
          (x < W - 1 && grown[i + 1]) ||
          (y > 0 && grown[i - W]) ||
          (y < H - 1 && grown[i + W])
        ) next[i] = 1;
      }
    }
    grown = next;
  }

  // 转成遮罩 PNG（白=尾巴）
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const v = grown[i] ? 255 : 0;
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  const mask = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

  // 统计一下，便于判断有没有漏到奇怪的地方
  let minX = W, maxX = 0, minY = H, maxY = 0, count = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (region[y * W + x]) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return {
    mask,
    region,
    W,
    H,
    growth: count / (W * H),
    bbox: { minX, maxX, minY, maxY },
  };
}

module.exports = { tailRegion };

if (require.main === module) {
  (async () => {
    const src = P('raw-assets/cat/aylen-full-hat.png');
    const { mask, W, H, growth, bbox } = await tailRegion(src);
    console.log(
      `填充面积 ${(growth * 100).toFixed(1)}%（bbox ${bbox.minX},${bbox.minY} → ${bbox.maxX},${bbox.maxY}）`
    );
    const maskBuf = await sharp(mask).extractChannel(0).toBuffer();
    const line = Buffer.from(
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="e"><feMorphology operator="dilate" radius="1.2"/></filter></defs>
      </svg>`
    );
    // 红色半透明覆盖 + 边界：用遮罩自身做 alpha，再用差值描边
    const red = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 255, g: 0, b: 90, alpha: 0.55 } },
    })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    const inner = await sharp(mask)
      .composite([{ input: await sharp(mask).blur(3).threshold(200).toBuffer(), blend: 'dest-out' }])
      .png()
      .toBuffer();

    const composed = await sharp(src)
      .composite([{ input: red }, { input: inner }])
      .png()
      .toBuffer();
    const left = Math.round(0.52 * W), top = Math.round(0.56 * H);
    const w = Math.round(0.48 * W), h = Math.round(0.4 * H);
    const png = await sharp(composed).extract({ left, top, width: w, height: h }).toBuffer();
    const scale = Math.min(3.5, 1400 / w);
    fs.mkdirSync(P('raw-assets/cat'), { recursive: true });
    await sharp(png)
      .resize({ width: Math.round(w * scale), kernel: 'nearest' })
      .png()
      .toFile(P('raw-assets/cat/_chk-tailregion.png'));
    console.log('→ raw-assets/cat/_chk-tailregion.png');
    void line;
    void maskBuf;
  })();
}
