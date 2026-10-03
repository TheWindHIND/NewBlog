/**
 * 芙卡洛斯之剑（横置长剑）矢量几何
 * ---------------------------------------------------------------
 * 参考：E:/小米互传/IMG_20261003_145826.jpg（歌剧院正面）+
 *      E:/小米互传/Screenshot_2026-10-03-15-00-47-338_tv.danmaku.bili.png（斜侧，看护手细节）
 *
 * v2 返工要点（用户反馈：太短像被压扁、没有剑柄）：
 *   · 总比例 240×660（≈1:2.75），剑身占全长一半以上，是「剑」不是「匕首」；
 *   · 补全剑柄：水滴剑首 → 领圈 → 缠绳握柄 → 柄环 → 细颈；
 *   · 护手云纹整体下移，套在握柄前端；双长刃拉长并收尖；
 *   · 末端仍是枫丹味的新月剑座 + 垂坠大水滴（剑尖穿过新月）。
 *
 * 结构（自上而下）：水滴剑首 → 领圈 → 握柄（四道绑绳）→ 柄环 → 细颈
 *                → 白色卷草护手 + 深蓝菱节点（居中）
 *                → 双长刃（平行窄刃身，中脊细线，中段小菱饰）
 *                → 剑尖端：白色浪翼飞翼（新月大弧 + 两侧焰尖缺口 + 卷浪）
 *                  + 中央垂坠水滴（蓝刃尖自后方插入）
 *
 * 颜色一律以 presentation attribute 给出：var(--sword-*，回退色)，
 * 这样即使被 set:html 注入（拿不到 Astro scoped 属性）也不会退回黑色。
 * 传入 col 覆盖时输出纯字面色，便于离屏渲染校对。
 */

const CX = 120; // 中轴
const RAD = Math.PI / 180;

const FALLBACK = {
  1: '#eaf8ff',
  2: '#6cc0f0',
  3: '#2a76cf',
  edge: 'rgba(28,76,145,0.36)',
  orn: '#f2f9ff',
  'orn-edge': 'rgba(104,158,206,0.55)',
  'drop-in': '#d3f0ff',
  shine: 'rgba(255,255,255,0.78)',
  node: '#4a4a86',
  'node-edge': '#2c2c58',
  'node-in': '#7070b2',
  'node-drop': '#22224a',
};

/** 螺旋点列（y 向下，角度增大 = 屏幕上顺时针） */
const spiralPts = (cx, cy, r0, r1, a0, a1, n = 46) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * Math.pow(t, 0.88);
    const a = a0 + (a1 - a0) * t;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
};

const taper = (n, w0, w1) =>
  Array.from({ length: n }, (_, i) => w0 + (w1 - w0) * Math.pow(i / (n - 1), 1.3));

/** 变宽带：把一条折线加粗成两端收细的「卷草」 */
const ribbon = (pts, widths) => {
  const L = [];
  const R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // 宽度数组短了就沿用最后一档（否则会算出 NaN，整段路径失效）
    const h = (widths[Math.min(i, widths.length - 1)] ?? 0) / 2;
    L.push({ x: pts[i].x - (dy / len) * h, y: pts[i].y + (dx / len) * h });
    R.push({ x: pts[i].x + (dy / len) * h, y: pts[i].y - (dx / len) * h });
  }
  const f = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  return `M${L.map(f).join(' L')} L${R.reverse().map(f).join(' L')} Z`;
};

/** 把「M/C/L/Z + 成对 x,y」的简单路径镜像到 x → 240-x */
const mirrorPath = (d) => {
  const segs = d.match(/[MLCZ][^MLCZ]*/g) || [];
  return segs
    .map((seg) => {
      const cmd = seg[0];
      const ns = (seg.slice(1).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      for (let j = 0; j < ns.length; j += 2) ns[j] = 2 * CX - ns[j];
      return cmd + ns.map((n) => Math.round(n * 10) / 10).join(' ');
    })
    .join(' ');
};

/** 单侧卷草（mirror=true 出右侧）：贴刃外卷的一片「浪叶」+ 一处小卷 */
const flourish = (mirror) => {
  const m = (p) => (mirror ? { x: 2 * CX - p.x, y: p.y } : p);
  const main = [
    { x: 112, y: 24 },
    { x: 104, y: 23 },
    { x: 96, y: 24 },
    ...spiralPts(86, 26, 13, 3, -70 * RAD, -400 * RAD, 42),
  ].map(m);
  const sub = [
    { x: 118, y: 34 },
    { x: 110, y: 34 },
    ...spiralPts(108, 36, 9, 2.2, -45 * RAD, -340 * RAD, 34),
  ].map(m);
  const mir = (d) => (mirror ? mirrorPath(d) : d);
  return {
    main: ribbon(main, [9, 8.4, ...taper(44, 7.4, 1.8)]),
    sub: ribbon(sub, [7.4, 6.8, ...taper(35, 5.4, 1.4)]),
    leafA: mir(`M78 20 C66 10 46 4 30 10 C46 20 68 28 78 28 Z`),
    leafB: mir(`M92 38 C80 32 62 34 48 42 C64 50 82 47 92 44 Z`),
    gem: mir(`M60 6 C54 15 51 21 51 26 C51 32 55 36 60 36 C65 36 69 32 69 26 C69 21 66 15 60 6 Z`),
  };
};

// —— 剑首：朝上的水滴坠（尖朝上、圆朝下接领圈） ——
const POMMEL = `M120 3 C127 12 132 19 132 26 C132 33 127 37.5 120 37.5 C113 37.5 108 33 108 26 C108 19 113 12 120 3 Z`;
const POMMEL_IN = `M120 14 C124 20 126 24 126 27.5 C126 31.5 123.5 34 120 34 C116.5 34 114 31.5 114 27.5 C114 24 116 20 120 14 Z`;
const COLLAR = `M110 38 L130 38 L131 50 L109 50 Z`;

// —— 握柄：收细的柱身 + 四道斜绑绳 ——
const GRIP = `M109.5 50 L130.5 50 L129 140 L111 140 Z`;
const FERRULE = `M105 140 L135 140 L134 154 L106 154 Z`;
const NECK = `M114 154 L126 154 L125 200 L115 200 Z`;

// —— 双长刃（左半，右侧镜像）：窄刃身严格平行，只在末端收锋；
//    根部一小段外飞浪尖肩；两刃在中轴 y606 处合拢成一点，
//    合拢点落在「剑尖飞翼」内部 → 蓝刃尖会压在白色飞翼之上可见 ——
const PRONG = `M68 212 C74 220 78 230 81 244 L81 496 C84 546 96 584 120 606 L104 588 C100 562 103 536 103 504 L103 320 L103 236 L76 226 C72 220 70 216 68 212 Z`;

// —— 中段小菱饰 ——
const LOZENGE = `M120 368 L129 388 L120 408 L111 388 Z`;

// ===============================================================
// 剑尖端：白色浪翼飞翼（对照原图重画）
//   原图（Screenshot_2026-10-03-15-00-47 斜视 + IMG_20261003_145826 正面）
//   的末端结构：一条横跨极宽、中央最厚、两端收成尖角的新月大弧，
//   弧的两端各向「刃后方」甩出浪翼 —— 翼顶两枚焰尖中间夹 V 形缺口，
//   翼内一枚螺旋「卷浪」；中央垂一枚水滴，蓝刃尖自后方插入水滴。
//   整块是「白」的（与护手同色）—— 颜色不跟刃走，原图里这块就是白浪。
//   跨度 220 单位（对中轴 ±110）≈ 刃身总宽（78）的 2.8 倍（原图约 2.7）。
// ===============================================================

// 飞翼：纵深很大的后掠新月翼（两端尖角向后甩到 y540，纵深/跨度 ≈0.55，与原图一致）
// 跨度 204 ≈ 刃身总宽 78 的 2.6 倍
// 飞翼：后掠新月翼 —— 中央是宽阔大弧，两端各接一枚「与翼尖同向」的浪臂，
// 把翼尖继续甩向后外方（不再另生第二处尖角，避免出现「獠牙」感）。
// 跨度 196 ≈ 刃身总宽 78 的 2.5 倍
const FLARE = `M22 582 C36 626 66 650 120 658 C174 650 204 626 218 582 C204 602 170 620 120 624 C70 620 36 602 22 582 Z`;

/** 单侧翼面细节：后掠浪臂（与翼尖同向）+ 内旋卷浪，均叠在翼体上 */
const flareDetail = (mirror) => {
  const m = (p) => (mirror ? { x: 2 * CX - p.x, y: p.y } : p);
  const arm = [
    { x: 52, y: 630 },
    { x: 37, y: 610 },
    { x: 26, y: 590 },
    { x: 18, y: 566 },
  ].map(m);
  const curl = [
    { x: 88, y: 648 },
    { x: 82, y: 635 },
    { x: 88, y: 622 },
    ...spiralPts(96, 632, 10, 2.4, -120 * RAD, -430 * RAD, 36),
  ].map(m);
  return {
    arm: ribbon(arm, [23, 19, 13, 3]),
    curl: ribbon(curl, [5, 7, 8, ...taper(36, 8, 1.6)]),
  };
};

// —— 中央垂坠水滴（白，浅青内芯）——
const TIP_DROP = `M120 566 C129 586 134 601 134 612 C134 624 128 632 120 632 C112 632 106 624 106 612 C106 601 111 586 120 566 Z`;
const TIP_IN = `M120 588 C125 600 128 608 128 615 C128 622 124 627 120 627 C116 627 112 622 112 615 C112 608 115 600 120 588 Z`;

// —— 白面上的小菱饰（原图里那些细碎蓝菱）——
const FLARE_GEM = `M78 610 L83 617 L78 624 L73 617 Z`;

/**
 * 生成完整 <svg> 字符串
 * @param {Record<string,string>} [col] 覆盖色（字面值）；不传则输出 CSS 变量
 */
export function swordSVG(col) {
  const V = (k) => (col && col[k] ? col[k] : `var(--sword-${k}, ${FALLBACK[k]})`);
  const FL = flourish(false);
  const FR = flourish(true);
  const DL = flareDetail(false);
  const DR = flareDetail(true);
  const MIR = `matrix(-1 0 0 1 ${2 * CX} 0)`;

  const orn = `
    <g stroke="${V('orn-edge')}" stroke-width="3.4" stroke-linejoin="round">
    <path d="${FL.leafA}" fill="${V('orn')}"/>
    <path d="${FR.leafA}" fill="${V('orn')}"/>
    <path d="${FL.leafB}" fill="${V('orn')}"/>
    <path d="${FR.leafB}" fill="${V('orn')}"/>
    <path d="${FL.main}" fill="${V('orn')}"/>
    <path d="${FR.main}" fill="${V('orn')}"/>
    <path d="${FL.sub}" fill="${V('orn')}"/>
    <path d="${FR.sub}" fill="${V('orn')}"/>
    </g>`;

  // 握柄绑绳：四道斜线
  const bands = [66, 88, 110, 132]
    .map((y) => `<line x1="110.5" y1="${y + 7}" x2="129.5" y2="${y}" stroke="${V('1')}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>`)
    .join('');

  return `<svg viewBox="0 0 240 660" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="sword-svg">
  <defs>
    <linearGradient id="swpBody" gradientUnits="userSpaceOnUse" x1="120" y1="226" x2="120" y2="590">
      <stop offset="0" stop-color="${V('1')}"/>
      <stop offset="0.45" stop-color="${V('2')}"/>
      <stop offset="1" stop-color="${V('3')}"/>
    </linearGradient>
    <linearGradient id="swpPom" gradientUnits="userSpaceOnUse" x1="120" y1="3" x2="120" y2="38">
      <stop offset="0" stop-color="${V('2')}"/>
      <stop offset="1" stop-color="${V('3')}"/>
    </linearGradient>
  </defs>

  <!-- 1 剑柄：水滴剑首 → 领圈 → 缠绳握柄 → 柄环 → 细颈 -->
  <path class="sw-neck" d="${NECK}" fill="${V('2')}"/>
  <g class="sw-hilt" stroke="${V('edge')}" stroke-width="2.4" stroke-linejoin="round">
    <path d="${GRIP}" fill="${V('3')}"/>
  </g>
  ${bands}
  <path class="sw-collar" d="${COLLAR}" fill="${V('2')}" stroke="${V('edge')}" stroke-width="2.4" stroke-linejoin="round"/>
  <path class="sw-ferrule" d="${FERRULE}" fill="${V('2')}" stroke="${V('edge')}" stroke-width="2.4" stroke-linejoin="round"/>
  <g class="sw-pommel" stroke="${V('edge')}" stroke-width="2.4" stroke-linejoin="round">
    <path d="${POMMEL}" fill="url(#swpPom)"/>
  </g>
  <path class="sw-pommel-in" d="${POMMEL_IN}" fill="${V('drop-in')}"/>

  <!-- 2 白色卷草护手 + 深蓝菱节点（整体下移到握柄前端） -->
  <g class="sw-guard" transform="translate(0,158)">
    <g class="sw-orn">${orn}</g>
    <path class="sw-orn-gem" d="${FL.gem}" fill="${V('2')}"/>
    <path class="sw-orn-gem" d="${FR.gem}" fill="${V('2')}"/>
    <g class="sw-node" stroke="${V('node-edge')}" stroke-width="3" stroke-linejoin="round">
      <path d="M120 33 L134.5 52.5 L120 72 L105.5 52.5 Z" fill="${V('node')}"/>
      <path class="sw-node-in" d="M120 41 L127.5 52.5 L120 64 L112.5 52.5 Z" fill="${V('node-in')}"/>
      <path class="sw-node-drop" d="M120 43.5 C124 49 126.2 53 126.2 56.4 C126.2 60.2 123.5 63 120 63 C116.5 63 113.8 60.2 113.8 56.4 C113.8 53 116 49 120 43.5 Z" fill="${V('node-drop')}"/>
    </g>
  </g>

  <!-- 3 中脊细线 + 中段小菱饰（细线向下接「链珠」） -->
  <path class="sw-thread" d="M120 240 L120 552" stroke="${V('1')}" stroke-width="2.6" stroke-linecap="round"/>
  <path class="sw-lozenge" d="${LOZENGE}" fill="${V('2')}" opacity="0.9"/>

  <!-- 4 剑尖端 · 白色后掠浪翼（新月大弧，两端尖角后甩 + 内旋卷浪） -->
  <g class="sw-flare" stroke="${V('orn-edge')}" stroke-width="2.4" stroke-linejoin="round">
    <path d="${FLARE}" fill="${V('orn')}"/>
    <path d="${DL.arm}" fill="${V('orn')}"/>
    <path d="${DR.arm}" fill="${V('orn')}"/>
    <path d="${DL.curl}" fill="${V('orn')}"/>
    <path d="${DR.curl}" fill="${V('orn')}"/>
  </g>
  <path class="sw-flare-gem" d="${FLARE_GEM}" fill="${V('orn-edge')}" opacity="0.5"/>
  <path class="sw-flare-gem" d="${FLARE_GEM}" fill="${V('orn-edge')}" opacity="0.5" transform="${MIR}"/>

  <!-- 5 中央垂坠水滴（白，浅青内芯）+ 链珠 -->
  <circle class="sw-bead2" cx="120" cy="556" r="4.2" fill="${V('orn')}" stroke="${V('orn-edge')}" stroke-width="2"/>
  <path class="sw-drop" d="${TIP_DROP}" fill="${V('orn')}" stroke="${V('orn-edge')}" stroke-width="3" stroke-linejoin="round"/>
  <path class="sw-drop-in" d="${TIP_IN}" fill="${V('drop-in')}"/>
  <ellipse class="sw-shine" cx="112" cy="606" rx="3" ry="6" transform="rotate(-14 112 606)" fill="${V('shine')}"/>

  <!-- 6 双长刃（后画：刃尖压在白色飞翼之上，暗蓝刃尖正好插进水滴） -->
  <g class="sw-blade" stroke="${V('edge')}" stroke-width="2.4" stroke-linejoin="round">
    <path d="${PRONG}" fill="url(#swpBody)"/>
    <path d="${PRONG}" fill="url(#swpBody)" transform="${MIR}"/>
  </g>
</svg>`;
}
