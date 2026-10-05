#!/usr/bin/env node
/**
 * 通用图片入库脚本：把 raw-assets 里的原图压成站点用的 webp。
 *
 *   node scripts/optimize-media.cjs                # 跑下面 JOBS 里登记的任务
 *
 * 约定（见 .workbuddy/memory/MEMORY.md）：
 *  - 原图一律先进 raw-assets/ 留档，不进 public/；
 *  - public/ 只放压好的 webp（长边不超过 MAXW，避免拖慢国内访问）。
 *  - 只缩不放：原图比目标小就不放大。
 *
 *  加新图 = 往 JOBS 里加一行，然后 node scripts/optimize-media.cjs
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** 长边上限（px）与质量：按用途分档 */
const PRESETS = {
  hero: { width: 2000, quality: 82 }, // 整屏插画
  post: { width: 1800, quality: 80 }, // 文章页插画带 / 封面
  card: { width: 1200, quality: 80 }, // 卡片封面、友链封面
  avatar: { width: 320, quality: 82 }, // 头像
};

/** 登记表：{ from: raw-assets 下的原图, to: public 下的 webp, preset } */
const JOBS = [
  { from: 'post/grand-opening-src.jpg', to: 'images/post/grand-opening.webp', preset: 'card' },
  { from: 'post/white-src.png', to: 'images/post/white-dream.webp', preset: 'post' },
  { from: 'links/lqy-site.jpg', to: 'images/links/lqy-site.webp', preset: 'card' },
  { from: 'links/lqy-avatar.jpg', to: 'images/links/lqy-avatar.webp', preset: 'avatar' },
];

(async () => {
  for (const job of JOBS) {
    const src = path.join(ROOT, 'raw-assets', job.from);
    const dest = path.join(ROOT, 'public', job.to);
    if (!fs.existsSync(src)) {
      console.log('SKIP (原图不存在)', job.from);
      continue;
    }
    const { width: ow, height: oh } = await sharp(src).metadata();
    const p = PRESETS[job.preset] ?? PRESETS.card;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const shrink = ow > p.width;
    let pipe = sharp(src);
    if (shrink) pipe = pipe.resize({ width: p.width, withoutEnlargement: true });
    await pipe.webp({ quality: p.quality, effort: 6 }).toFile(dest);
    const { size } = fs.statSync(dest);

    // 平均亮度：用来判断这张图该不该在 frontmatter 里标 bgTone: bright
    // （亮图在夜主题下会被主题纱压到看不见，必须换 --post-bright-* 那一套令牌）
    const { data, info } = await sharp(dest).resize({ width: 64 }).raw().toBuffer({ resolveWithObject: true });
    let lum = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const o = i * info.channels;
      lum += 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    }
    lum /= info.width * info.height;
    const tone = lum >= 150 ? 'bright（当成插画用记得标 bgTone: bright）' : 'dark/auto（可直接用主题默认令牌）';

    console.log(
      `${job.from}  ${ow}x${oh}  ->  ${job.to}  ${shrink ? `${p.width}w ` : ''}${(size / 1024).toFixed(1)}KB  亮度 ${lum.toFixed(0)} → ${tone}`
    );
  }
})();
