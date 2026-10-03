/**
 * 离屏校对：把大剑按昼夜两套配色渲染到对应底色上，多个尺寸并排看。
 * 用法: node scripts/render-sword.cjs
 */
const sharp = require('sharp');
const path = require('path');

const OUSIA = { bg: '#0b1526', col: { 1: '#eefaff', 2: '#66c6f5', 3: '#2f7fd8', edge: 'rgba(150,215,255,0.38)', orn: '#eef8ff', 'orn-edge': 'rgba(140,190,230,0.6)', 'drop-in': '#cdeeff', shine: 'rgba(255,255,255,0.8)', node: '#55558f', 'node-edge': '#2b2b56', 'node-in': '#7a7ab8', 'node-drop': '#1f1f45' } };
const PNEUMA = { bg: '#f7f3e8', col: { 1: '#f4fcff', 2: '#4aa8e0', 3: '#1f5cb4', edge: 'rgba(26,74,140,0.32)', orn: '#ffffff', 'orn-edge': 'rgba(90,140,190,0.5)', 'drop-in': '#dcf2ff', shine: 'rgba(255,255,255,0.88)', node: '#4a4a86', 'node-edge': '#2c2c58', 'node-in': '#7070b2', 'node-drop': '#22224a' } };

const HEIGHTS = [54, 108, 216];

(async () => {
  const { swordSVG } = await import('../src/lib/sword-geom.mjs');
  for (const [name, cfg] of [['ousia', OUSIA], ['pneuma', PNEUMA]]) {
    const layers = [];
    let x = 24;
    let maxH = 0;
    for (const h of HEIGHTS) {
      const w = Math.round((h * 240) / 660) + 90;
      const svg = swordSVG(cfg.col).replace('width="100%" height="100%"', `width="${w}" height="${h}"`);
      const buf = await sharp(Buffer.from(svg)).png().toBuffer();
      const meta = await sharp(buf).metadata();
      layers.push({ input: buf, left: x, top: 30 });
      x += meta.width + 18;
      maxH = Math.max(maxH, meta.height);
    }
    await sharp({
      create: { width: x, height: maxH + 60, channels: 4, background: cfg.bg },
    })
      .composite(layers)
      .png()
      .toFile(path.join('raw-assets', 'ref', `sword-${name}.png`));
    console.log(`raw-assets/ref/sword-${name}.png`);
  }

  // —— 与原参考并排对照 ——
  const H = 380;
  const refSvg = swordSVG(OUSIA.col).replace('width="100%" height="100%"', `width="${Math.round((H * 240) / 660)}" height="${H}"`);
  const refBuf = await sharp(Buffer.from(refSvg)).png().toBuffer();
  const refMeta = await sharp(refBuf).metadata();
  // 参考图里剑的范围（探针测得的比例）
  const src = await sharp('E:/小米互传/IMG_20261003_145826.jpg').metadata();
  const left = Math.round(0.17 * src.width);
  const top = Math.round(0.04 * src.height);
  const width = Math.round(0.66 * src.width);
  const height = Math.round(0.86 * src.height);
  const refCrop = await sharp('E:/小米互传/IMG_20261003_145826.jpg')
    .extract({ left, top, width, height })
    .resize({ height: H })
    .png()
    .toBuffer();
  const refCropMeta = await sharp(refCrop).metadata();
  await sharp({ create: { width: refMeta.width + refCropMeta.width + 90, height: H + 60, channels: 4, background: '#e9e9ee' } })
    .composite([
      { input: refCrop, left: 20, top: 30 },
      { input: refBuf, left: refCropMeta.width + 60, top: 30 },
    ])
    .png()
    .toFile(path.join('raw-assets', 'ref', 'sword-compare.png'));
  console.log('raw-assets/ref/sword-compare.png  (左=参考 右=矢量稿)');
})();
