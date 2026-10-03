/**
 * 剑尖专项校对：竖版大图（看结构）+ 与参考并排 + 横置真实尺寸。
 * 用法: node scripts/render-tip.cjs
 */
const sharp = require('sharp');
const path = require('path');

const OUSIA = { bg: '#0b1526', col: { 1: '#eefaff', 2: '#66c6f5', 3: '#2f7fd8', edge: 'rgba(150,215,255,0.38)', orn: '#eef8ff', 'orn-edge': 'rgba(120,180,225,0.75)', 'drop-in': '#cdeeff', shine: 'rgba(255,255,255,0.8)', node: '#55558f', 'node-edge': '#2b2b56', 'node-in': '#7a7ab8', 'node-drop': '#1f1f45' } };
const PNEUMA = { bg: '#f7f3e8', col: { 1: '#f4fcff', 2: '#4aa8e0', 3: '#1f5cb4', edge: 'rgba(26,74,140,0.32)', orn: '#ffffff', 'orn-edge': 'rgba(31,92,180,0.72)', 'drop-in': '#dcf2ff', shine: 'rgba(255,255,255,0.88)', node: '#4a4a86', 'node-edge': '#2c2c58', 'node-in': '#7070b2', 'node-drop': '#22224a' } };

(async () => {
  const { swordSVG } = await import('../src/lib/sword-geom.mjs');

  // 1) 竖版大图（整把 + 剑尖放大）
  for (const [name, cfg] of [['ousia', OUSIA], ['pneuma', PNEUMA]]) {
    const H = 620;
    const W = Math.round((H * 240) / 660);
    const svg = swordSVG(cfg.col).replace('width="100%" height="100%"', `width="${W}" height="${H}"`);
    await sharp(Buffer.from(svg)).flatten({ background: cfg.bg }).png().toFile(path.join('raw-assets', 'ref', `tip-full-${name}.png`));
    await sharp(path.join('raw-assets', 'ref', `tip-full-${name}.png`))
      .extract({ left: 0, top: Math.round(H * 0.60), width: W, height: Math.round(H * 0.40) })
      .resize({ width: W * 3, kernel: 'lanczos3' })
      .png()
      .toFile(path.join('raw-assets', 'ref', `tip-zoom-${name}.png`));
    console.log(`raw-assets/ref/tip-full-${name}.png / tip-zoom-${name}.png`);
  }

  // 2) 横置真实显示尺寸（176×64 容器）
  const L = 176;
  const Wv = Math.round((L * 240) / 660); // 64
  const svgV = swordSVG(OUSIA.col).replace('width="100%" height="100%"', `width="${Wv}" height="${L}"`);
  // 注意：sharp 的 resize 同时给宽高时默认 fit:cover 会裁切 —— SVG 本身已按 Wv×L 渲染，别再 resize
  const buf = await sharp(Buffer.from(svgV))
    .rotate(-90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const bm = await sharp(buf).metadata();
  await sharp({ create: { width: bm.width + 24, height: Math.max(96, bm.height + 56), channels: 4, background: '#0d1a2e' } })
    .composite([{ input: buf, left: 12, top: 28 }])
    .png()
    .toFile(path.join('raw-assets', 'ref', 'tip-horizontal.png'));
  console.log(`raw-assets/ref/tip-horizontal.png  (${bm.width}x${bm.height})`);

  // 3) 与参考并排（左=原图剑尖裁切，右=矢量剑尖）
  const ref = await sharp('raw-assets/ref/ref-tip-zoom.png').resize({ height: 420 }).png().toBuffer();
  const mine = await sharp(path.join('raw-assets', 'ref', 'tip-zoom-ousia.png')).resize({ height: 420 }).png().toBuffer();
  const a = await sharp(ref).metadata();
  const b = await sharp(mine).metadata();
  await sharp({ create: { width: a.width + b.width + 60, height: 480, channels: 4, background: '#e9e9ee' } })
    .composite([{ input: ref, left: 20, top: 30 }, { input: mine, left: a.width + 40, top: 30 }])
    .png()
    .toFile(path.join('raw-assets', 'ref', 'tip-compare.png'));
  console.log('raw-assets/ref/tip-compare.png  (左=原图 右=矢量稿)');
})();
