/**
 * 生成「改版前 / 改版后」猫猫对比图（仅用于交付给用户查看，不参与构建）
 */
const sharp = require('sharp');

const NEW = 'public/images/cat';
const OLD = 'raw-assets/cat/old';

async function compose(dir, W, H) {
  const tail = await sharp(`${dir}/aylen-tail.webp`).toBuffer();
  const body = await sharp(`${dir}/aylen-body.webp`).toBuffer();
  const head = await sharp(`${dir}/aylen-head.webp`).toBuffer();
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: tail, top: 0, left: 0 },
      { input: body, top: 0, left: 0 },
      { input: head, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}

(async () => {
  const oldMeta = await sharp(`${OLD}/aylen-head.webp`).metadata();
  const newMeta = await sharp(`${NEW}/aylen-head.webp`).metadata();

  const TARGET_H = 660;
  const oldH = TARGET_H, oldW = Math.round(oldMeta.width * (TARGET_H / oldMeta.height));
  const newH = TARGET_H, newW = Math.round(newMeta.width * (TARGET_H / newMeta.height));

  const oldCat = await sharp(await compose(OLD, oldMeta.width, oldMeta.height)).resize(oldW, oldH).png().toBuffer();
  const newCat = await sharp(await compose(NEW, newMeta.width, newMeta.height)).resize(newW, newH).png().toBuffer();

  const GAP = 56;
  const PAD = 44;
  const CW = PAD + oldW + GAP + newW + PAD;
  const CH = PAD + TARGET_H + PAD;

  const divider = Buffer.from(
    `<svg width="${GAP}" height="${TARGET_H}" xmlns="http://www.w3.org/2000/svg">` +
      `<line x1="${GAP / 2}" y1="10" x2="${GAP / 2}" y2="${TARGET_H - 10}" stroke="#3d5a86" stroke-width="2" stroke-dasharray="7 9"/></svg>`
  );

  const out = await sharp({
    create: { width: CW, height: CH, channels: 4, background: { r: 11, g: 21, b: 38, alpha: 1 } },
  })
    .composite([
      { input: oldCat, top: PAD, left: PAD },
      { input: divider, top: PAD, left: PAD + oldW },
      { input: newCat, top: PAD, left: PAD + oldW + GAP },
    ])
    .png()
    .toFile('raw-assets/cat/_compare.png');

  console.log('compare', `${out.width}x${out.height}`, Math.round(out.size / 1024) + 'KB');
})();
