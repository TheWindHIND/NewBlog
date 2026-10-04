/**
 * 尾巴分层诊断：把生成好的 tail / body 两层分别衬在品红底上放大，
 * 一眼看出「尾巴层里混进了裙子/袖子像素」还是「身体层里残留了尾巴像素」。
 *
 *   node scripts/_chk-tail-layers.cjs [x0 y0 x1 y1]   # 归一化裁切框，默认尾巴区
 */
const sharp = require('sharp');
const path = require('path');

const P = (p) => path.join(__dirname, '..', p);
const [, , ax0 = '0.55', ay0 = '0.62', ax1 = '0.95', ay1 = '0.92'] = process.argv;
const box = [Number(ax0), Number(ay0), Number(ax1), Number(ay1)];

const MAGENTA = { r: 255, g: 0, b: 255, alpha: 1 };

(async () => {
  const files = [
    ['tail', 'public/images/cat/aylen-tail.webp'],
    ['body', 'public/images/cat/aylen-body.webp'],
    ['head', 'public/images/cat/aylen-head.webp'],
  ];
  const panels = [];
  for (const [name, rel] of files) {
    const img = sharp(P(rel));
    const meta = await img.metadata();
    const left = Math.round(box[0] * meta.width);
    const top = Math.round(box[1] * meta.height);
    const w = Math.round((box[2] - box[0]) * meta.width);
    const h = Math.round((box[3] - box[1]) * meta.height);
    const over = await sharp({
      create: { width: meta.width, height: meta.height, channels: 4, background: MAGENTA },
    })
      .composite([{ input: await img.png().toBuffer(), top: 0, left: 0 }])
      .png()
      .toBuffer();
    const png = await sharp(over).extract({ left, top, width: w, height: h }).toBuffer();
    const up = await sharp(png).resize({ width: 520, kernel: 'nearest' }).png().toBuffer();
    panels.push({ name, buf: up, meta });
    console.log(name.padEnd(5), `${meta.width}x${meta.height}`, '裁切', left, top, w, h, '→', up.length, 'B');
  }
  // 横向拼三栏
  const height = Math.max(...panels.map((p) => (p.meta ? panels[0].buf : panels[0].buf).length && 0)) || 0;
  const metas = await Promise.all(panels.map((p) => sharp(p.buf).metadata()));
  const H = Math.max(...metas.map((m) => m.height));
  const W = metas.reduce((s, m) => s + m.width, 0) + (panels.length - 1) * 12;
  const out = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 30, g: 30, b: 40, alpha: 1 } } })
    .composite(
      panels.map((p, i) => ({
        input: p.buf,
        left: metas.slice(0, i).reduce((s, m) => s + m.width + 12, 0),
        top: 0,
      }))
    )
    .png()
    .toFile(P('raw-assets/cat/_chk-tail-layers.png'));
  console.log('→ raw-assets/cat/_chk-tail-layers.png', out.width + 'x' + out.height, '（左：tail / 中：body / 右：head）');
})();
