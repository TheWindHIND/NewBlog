/**
 * 用「构建产物里的真实标记」渲染预览：
 *  · 阅读进度条三种进度下大剑的位置（验证只平移、不变形）
 *  · 荒 / 芒 两种主题下的寒天之钉图标
 * 用法: node scripts/preview-built.cjs  （需先 npm run build）
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = 'raw-assets/ref';
const plain = (svg) => svg.replace(/data-astro-cid-[a-z0-9]+/gi, '').replace(/<!--[\s\S]*?-->/g, '');

// 直接从 tokens.css 里取各主题变量，保证预览用的是站点真正的配色
const css = fs.readFileSync(path.join('src', 'styles', 'tokens.css'), 'utf8');
const themeVars = (theme) => {
  const re = theme
    ? new RegExp(`:root\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`)
    : /^:root\s*\{([\s\S]*?)\n\}/m;
  const block = re.exec(css)?.[1] || '';
  const map = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
};
const ROOT_VARS = themeVars(null);
const SUB = (svg, vars) =>
  svg.replace(/var\((--[a-z0-9-]+)\s*,\s*([^)]+)\)/gi, (_m, name, fb) => vars[name] || fb.trim());

(async () => {
  const file = path.join('dist', 'posts', 'hello-world', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const swordSVG = html.match(/<svg viewBox="0 0 240 660"[\s\S]*?<\/svg>/);
  const nails = html.match(/<svg viewBox="0 0 72 132"[\s\S]*?<\/svg>/g) || [];
  if (!swordSVG) throw new Error('构建产物里没找到大剑 svg');
  console.log(`找到大剑 svg ${swordSVG[0].length} 字节；寒天之钉 ${nails.length} 个`);

  const swordRaw = swordSVG[0];
  const WARN = (s) => (s.match(/var\(/g) || []).length;

  const THEMES = [
    { id: 'ousia', bar: '#0b1526', header: 'rgba(11,21,38,0.78)', text: '#dce8f5', track: 'rgba(91,192,232,0.16)', fill: ['#2f7fd8', '#66c6f5', '#eefaff'], glow: 'rgba(102,198,245,0.6)', body: '#122039' },
    { id: 'pneuma', bar: '#f7f3e8', header: 'rgba(247,243,232,0.8)', text: '#241f16', track: 'rgba(212,169,79,0.2)', fill: ['#1f5cb4', '#4aa8e0', '#f4fcff'], glow: 'rgba(58,127,201,0.5)', body: '#fffdf6' },
  ];

  for (const t of THEMES) {
    const vars = { ...ROOT_VARS, ...themeVars(t.id) };
    const sword = SUB(plain(swordRaw), vars);
    if (WARN(sword)) console.warn(`  ⚠ ${t.id} 仍有 var() 未替换: ${WARN(sword)}`);
    else console.log(`  ${t.id} 大剑配色解析完成（--sword-orn = ${vars['--sword-orn']}）`);
    const W = 820;
    const SW = 176; // 横置后的长度
    const SH = 64; // 横置后的高度
    const layers = [];

    // 模拟粘性头部：品牌 + 导航 + 主题按钮，用来检查剑滑过时是否挡导航
    const headSvg = `<svg width="${W}" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="64" fill="${t.header}"/>
      <rect y="63" width="${W}" height="1" fill="${t.track}"/>
      <text x="20" y="39" font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="17" font-weight="700" fill="${t.text}">藏枫的猫窝</text>
      ${[0, 1, 2, 3, 4, 5]
        .map(
          (i) =>
            `<rect x="${W - 430 + i * 66}" y="22" width="${52 - (i % 3) * 8}" height="20" rx="10" fill="${t.text}" opacity="0.32"/>`
        )
        .join('')}
      <circle cx="${W - 27}" cy="32" r="17" fill="${t.body}"/>
    </svg>`;
    layers.push({ input: Buffer.from(headSvg), left: 0, top: 0 });

    for (const p of [0.03, 0.5, 0.97]) {
      const x = 6 + p * (W - SW - 12);
      // 先按竖版尺寸渲染，再逆时针转 90°（与组件里 rotate(-90deg) 一致）
      const svg = sword.replace('width="100%" height="100%"', `width="${SH}" height="${SW}"`);
      const buf = await sharp(Buffer.from(svg))
        .rotate(-90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      layers.push({ input: buf, left: Math.round(x), top: 0 });
      const fillW = Math.round(x + SW * 0.5);
      const fillSvg = `<svg width="${fillW}" height="2" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.fill[0]}"/><stop offset="1" stop-color="${t.fill[1]}"/></linearGradient></defs><rect width="${fillW}" height="2" fill="url(#g)"/></svg>`;
      layers.push({ input: Buffer.from(fillSvg), left: 0, top: 0 });
    }
    // 主题按钮里的钉子
    const pick = t.id === 'ousia' ? 0 : 1;
    const iconSvg = SUB(plain(nails[pick]), vars).replace('width="100%" height="100%"', 'width="26" height="32"');
    const iconBuf = await sharp(Buffer.from(iconSvg)).png().toBuffer();
    layers.push({ input: iconBuf, left: W - 40, top: 16 });

    await sharp({ create: { width: W, height: 96, channels: 4, background: t.header } })
      .composite(layers)
      .png()
      .toFile(path.join(OUT, `bar-${t.id}.png`));
    console.log(`${OUT}/bar-${t.id}.png  （同一条线上三个进度，剑形应完全一致）`);

    // —— 图标区 ——
    const iconLayers = [];
    let ix = 30;
    for (const n of nails) {
      const state = /data-nail="([a-z]+)"/.exec(n)?.[1] || '?';
      const svg = SUB(plain(n), vars).replace('width="100%" height="100%"', 'width="112" height="205"');
      const buf = await sharp(Buffer.from(svg)).png().toBuffer();
      iconLayers.push({ input: buf, left: ix, top: 30 });
      ix += 140;
      console.log(`  图标 ${state}`);
    }
    await sharp({ create: { width: ix + 20, height: 265, channels: 4, background: t.body } })
      .composite(iconLayers)
      .png()
      .toFile(path.join(OUT, `toggle-${t.id}.png`));
    console.log(`${OUT}/toggle-${t.id}.png`);
  }
})();
