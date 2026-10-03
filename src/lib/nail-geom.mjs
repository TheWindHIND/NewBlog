/**
 * 寒天之钉（Skyfrost Nail）矢量几何
 * ---------------------------------------------------------------
 * 参考：E:/小米互传/Screenshot_2026-10-03-14-50-29-660_com.android.browser.png（完整，最清晰）
 *      E:/小米互传/dcbab8e1736c515a.jpg（完整，远景）
 *      E:/小米互传/Screenshot_2026-10-03-14-51-43-249_com.android.browser.png（碎裂）
 *
 * 结构（自上而下）：角冠（深色浪刃 + 基座纹）→ 喇叭口（宽沿 + 内暗椭圆）
 *                → 正面拱形宝石 → 菱形格纹带 → 锥形柱身（中段蓝菱 + 深色竖缝）
 *                → 冰晶锥尖；四周漂浮碎冰。
 * 碎裂态：同样构件拆成 5 块错位旋转，加裂纹与飞散碎屑。
 *
 * 颜色走 --nail-* 变量，昼夜两套（荒=完整、芒=碎裂）。
 */

const FALLBACK = {
  'body-1': '#ffffff',
  'body-2': '#cfe0ef',
  edge: 'rgba(60,110,160,0.45)',
  line: '#4f7fa8',
  gem: '#46a6e6',
  'gem-core': '#e6f7ff',
  horn: '#7c93ab',
  glow: 'rgba(90,170,230,0.4)',
};

// —— 构件 ——
const HORN = `M27 32 C30 14 41 4 58 2 C48 13 40 23 37 32 Z`;
const RIM = `M14 34 C14 46 23 54 36 54 C49 54 58 46 58 34 Z`;
const GEM = `M36 27 C44 38 48 45 48 50 C48 57 43 61 36 61 C29 61 24 57 24 50 C24 45 28 38 36 27 Z`;
const GEM_CORE = `M36 34 C41 41 43 45 43 49 C43 54 40 56 36 56 C32 56 29 54 29 49 C29 45 31 41 36 34 Z`;
const BAND = `M23 51 L49 51 L46 74 L26 74 Z`;
const SHAFT = `M26 72 L46 72 L43 104 L36 114 L29 104 Z`;
const CRYSTAL = `M36 98 L44 108 L40 120 L36 128 L32 120 L28 108 Z`;

const DIAMOND = (cx, cy, w, h) =>
  `M${cx} ${cy - h / 2} L${cx + w / 2} ${cy} L${cx} ${cy + h / 2} L${cx - w / 2} ${cy} Z`;

const CHIPS = [
  { x: 9, y: 58, s: 7, r: 22 },
  { x: 60, y: 47, s: 6, r: -18 },
  { x: 15, y: 88, s: 8, r: 34 },
  { x: 58, y: 96, s: 6, r: -28 },
];

/**
 * @param {'whole'|'shattered'} state
 * @param {Record<string,string>} [col]
 */
export function nailSVG(state, col) {
  const V = (k) => (col && col[k] ? col[k] : `var(--nail-${k}, ${FALLBACK[k]})`);
  const edge = `stroke="${V('edge')}" stroke-width="1.3" stroke-linejoin="round"`;

  const chips = CHIPS.map(
    (c) => `<rect x="${c.x}" y="${c.y}" width="${c.s}" height="${c.s}" rx="1.2" fill="${V('gem-core')}" opacity="0.9" transform="rotate(${c.r} ${c.x + c.s / 2} ${c.y + c.s / 2})"/>`
  ).join('\n    ');

  const horn = `<g transform="translate(0 -1)">
      <path d="${HORN}" fill="${V('horn')}" ${edge}/>
      <path d="M28 30 C30 21 36 13 44 9" fill="none" stroke="${V('line')}" stroke-width="1" opacity="0.5"/>
    </g>`;

  const rim = `<path d="${RIM}" fill="${V('body-2')}" ${edge}/>
    <ellipse cx="36" cy="34" rx="22" ry="5.6" fill="${V('body-1')}" ${edge}/>
    <ellipse cx="36" cy="34" rx="15" ry="3.2" fill="${V('line')}" opacity="0.5"/>
    <ellipse cx="25" cy="43" rx="4" ry="5.6" fill="${V('gem')}" ${edge}/>
    <ellipse cx="47" cy="43" rx="4" ry="5.6" fill="${V('gem')}" ${edge}/>`;

  const gem = `<path d="${GEM}" fill="${V('gem')}" ${edge}/>
    <path d="${GEM_CORE}" fill="${V('gem-core')}" opacity="0.85"/>`;

  const lattice = `<path d="${BAND}" fill="${V('body-1')}" ${edge}/>
    <path d="M23 51 L49 74 M49 51 L23 74 M36 51 L36 74" fill="none" stroke="${V('line')}" stroke-width="1.1" opacity="0.5"/>
    <path d="${DIAMOND(29, 57, 12, 13)} ${DIAMOND(43, 57, 12, 13)} ${DIAMOND(36, 68, 12, 13)}" fill="none" stroke="${V('line')}" stroke-width="1.2" opacity="0.8"/>`;

  const shaft = `<path d="${SHAFT}" fill="${V('body-1')}" ${edge}/>
    <path d="M32.5 76 L32.5 100 M39.5 76 L39.5 100" stroke="${V('line')}" stroke-width="1" opacity="0.5"/>
    <path d="${DIAMOND(36, 88, 9, 13)}" fill="${V('gem')}" ${edge}/>`;

  const crystal = `<path d="${CRYSTAL}" fill="${V('gem')}" ${edge}/>
    <path d="M36 102 L36 126" stroke="${V('gem-core')}" stroke-width="1.4" opacity="0.8"/>`;

  const body =
    state === 'whole'
      ? `    ${crystal}
    ${shaft}
    ${lattice}
    ${rim}
    ${gem}
    ${horn}
    <g>${chips}</g>`
      : `    <g transform="rotate(-17 36 30) translate(-6 -5)">${horn}${rim}</g>
    <g transform="rotate(16 36 50) translate(7 4)">${gem}</g>
    <g transform="rotate(-24 36 64) translate(-8 5)">${lattice}</g>
    <g transform="rotate(20 36 90) translate(6 6)">${shaft}</g>
    <g transform="rotate(9 36 114) translate(3 9)">${crystal}</g>
    <path class="na-crack" d="M22 46 L34 42 L30 56 L44 52" fill="none" stroke="${V('line')}" stroke-width="1.2" opacity="0.45"/>
    <path class="na-crack" d="M26 80 L38 76 L34 92" fill="none" stroke="${V('line')}" stroke-width="1.1" opacity="0.4"/>
    <g>${chips}
    <rect x="44" y="18" width="7" height="7" rx="1.2" fill="${V('gem-core')}" opacity="0.85" transform="rotate(28 47.5 21.5)"/>
    <rect x="8" y="34" width="6" height="6" rx="1.2" fill="${V('gem-core')}" opacity="0.8" transform="rotate(-24 11 37)"/></g>`;

  return `<svg viewBox="0 0 72 132" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="nail-svg" data-nail="${state}">
${body}
</svg>`;
}
