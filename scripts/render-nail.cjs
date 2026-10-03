/**
 * 离屏校对：寒天之钉（完整 / 碎裂）昼夜两套配色，多个尺寸并排。
 * 用法: node scripts/render-nail.cjs
 */
const sharp = require('sharp');
const path = require('path');

const OUSIA = { bg: '#0b1526', col: { 'body-1': '#e8f2fb', 'body-2': '#9fb6cf', edge: 'rgba(160,215,255,0.4)', line: '#1b3450', gem: '#5ec8f7', 'gem-core': '#d8f5ff', horn: '#3d4f6a', glow: 'rgba(95,200,245,0.5)' } };
const PNEUMA = { bg: '#f7f3e8', col: { 'body-1': '#ffffff', 'body-2': '#cfe0ef', edge: 'rgba(60,110,160,0.45)', line: '#4f7fa8', gem: '#46a6e6', 'gem-core': '#e6f7ff', horn: '#7c93ab', glow: 'rgba(90,170,230,0.4)' } };

const HEIGHTS = [32, 64, 176];

(async () => {
  const { nailSVG } = await import('../src/lib/nail-geom.mjs');
  for (const [name, cfg] of [['ousia', OUSIA], ['pneuma', PNEUMA]]) {
    const layers = [];
    let x = 30;
    let maxH = 0;
    for (const state of ['whole', 'shattered']) {
      for (const h of HEIGHTS) {
        const w = Math.round((h * 72) / 132) + 40;
        const svg = nailSVG(state, cfg.col).replace('width="100%" height="100%"', `width="${w}" height="${h}"`);
        const buf = await sharp(Buffer.from(svg)).png().toBuffer();
        const meta = await sharp(buf).metadata();
        layers.push({ input: buf, left: x, top: 40 });
        x += meta.width + 22;
        maxH = Math.max(maxH, meta.height);
      }
    }
    await sharp({ create: { width: x, height: maxH + 80, channels: 4, background: cfg.bg } })
      .composite(layers)
      .png()
      .toFile(path.join('raw-assets', 'ref', `nail-${name}.png`));
    console.log(`raw-assets/ref/nail-${name}.png`);
  }
})();
