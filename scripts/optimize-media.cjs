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

/** 登记表：{ from: raw-assets 下的原图, to: public 下的 webp, preset, trim? } */
const JOBS = [
  { from: 'post/grand-opening-src.jpg', to: 'images/post/grand-opening.webp', preset: 'card' },
  { from: 'post/white-src.png', to: 'images/post/white-dream.webp', preset: 'post' },
  // 视频截图常带黑边（这张左右各 239px）——trim: 'auto' 自动裁掉
  { from: 'quotes/emergence-src.jpg', to: 'images/quotes/emergence.webp', preset: 'post', trim: 'auto' },
  // 归档页（星空猫座）整页背景：荒 = 夜城，芒 = 午后阳台
  { from: 'archive/ousia-night-src.jpg', to: 'images/archive/ousia-night.webp', preset: 'post' },
  { from: 'archive/pneuma-day-src.jpg', to: 'images/archive/pneuma-day.webp', preset: 'post' },
  { from: 'links/lqy-site.jpg', to: 'images/links/lqy-site.webp', preset: 'card' },
  { from: 'links/lqy-avatar.jpg', to: 'images/links/lqy-avatar.webp', preset: 'avatar' },
];

/** 四周纯黑边的宽度（像素）。视频截图 / 带黑边的画布很常见，先裁掉再压。 */
async function detectBars(src) {
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const DARK = 30;
  const lum = (x, y) => {
    const o = (y * w + x) * c;
    return 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  };
  const colDark = (x) => {
    let s = 0;
    for (let y = 0; y < h; y++) s += lum(x, y);
    return s / h < DARK;
  };
  const rowDark = (y) => {
    let s = 0;
    for (let x = 0; x < w; x++) s += lum(x, y);
    return s / w < DARK;
  };
  let l = 0;
  let r = 0;
  let t = 0;
  let b = 0;
  while (l < w - 4 && colDark(l)) l++;
  while (r < w - l - 4 && colDark(w - 1 - r)) r++;
  while (t < h - 4 && rowDark(t)) t++;
  while (b < h - t - 4 && rowDark(h - 1 - b)) b++;
  return { left: l, right: r, top: t, bottom: b };
}

(async () => {
  for (const job of JOBS) {
    const src = path.join(ROOT, 'raw-assets', job.from);
    const dest = path.join(ROOT, 'public', job.to);
    if (!fs.existsSync(src)) {
      console.log('SKIP (原图不存在)', job.from);
      continue;
    }
    let meta = await sharp(src).metadata();
    const { width: ow, height: oh } = meta;
    const p = PRESETS[job.preset] ?? PRESETS.card;

    // 裁黑边（可选）
    let geo = null;
    if (job.trim) {
      const bars = job.trim === 'auto' ? await detectBars(src) : {
        left: job.trim[0] ?? 0,
        right: job.trim[1] ?? 0,
        top: job.trim[2] ?? 0,
        bottom: job.trim[3] ?? 0,
      };
      const width = ow - bars.left - bars.right;
      const height = oh - bars.top - bars.bottom;
      if (width > 0 && height > 0 && (bars.left || bars.right || bars.top || bars.bottom)) {
        geo = { left: bars.left, top: bars.top, width, height };
        console.log(`  trim 黑边 左${bars.left} 右${bars.right} 上${bars.top} 下${bars.bottom} → ${width}x${height}`);
      } else {
        console.log('  trim: 没检测到黑边，跳过');
      }
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    let pipe = sharp(src);
    if (geo) pipe = pipe.extract(geo);
    const shrink = geo ? geo.width > p.width : ow > p.width;
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
      `${job.from}  ${ow}x${oh}${geo ? ` → 裁后 ${geo.width}x${geo.height}` : ''}  ->  ${job.to}  ${shrink ? `${p.width}w ` : ''}${(size / 1024).toFixed(1)}KB  亮度 ${lum.toFixed(0)} → ${tone}`
    );
  }
})();
