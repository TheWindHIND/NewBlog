/**
 * 枫丹徽记矢量化：把参考位图的轮廓自动描摹成 SVG 路径
 *
 * 流程：
 *  1. 二值化（金色像素 → 1）
 *  2. 去噪：删小连通域 / 填小洞
 *  3. 边界追踪（单位边 → 顶点图 → 闭环），鞍点处优先右转
 *  4. 折线平滑（滑动平均）+ Douglas-Peucker 简化
 *  5. 归一化到 240 单位画布，输出 SVG（配色用 CSS 变量，随主题换）
 *
 * 用法: node scripts/trace-emblem.cjs [源图] [输出svg] [--debug]
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SRC = ARGS[0] || 'E:/小米互传/4c7ad14dc728fda916a62fc81fceb055357648464_raw.jpg';
const OUT = ARGS[1] || 'src/assets/fontaine-crest.svg';
const DEBUG = process.argv.includes('--debug');

const THRESH = 84;          // 亮度阈值
const MIN_COMP = 14;        // 小于此面积的连通域视为噪点
const MIN_HOLE = 16;        // 小于此面积的洞填掉
const DP_EPS = 0.30;        // 简化容差（源像素）
const SMOOTH_ITER = 2;      // 折线滑动平均次数
const CORNER_ANG = 42;      // 大于此夹角视为角点（保留尖角）
const FIT_EPS = 0.45;       // 贝塞尔拟合误差（源像素）
const BOX = 240;            // 目标画布边长
const PAD = 6;              // 画布内边距

// ---------- 1) 二值化 ----------
(async () => {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const N = W * H;
  const mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * C;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    mask[i] = lum > THRESH && r > b + 8 ? 1 : 0;
  }

  // ---------- 2) 去噪 ----------
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x]);
  const comps = (want) => {
    const seen = new Uint8Array(N);
    const out = [];
    const st = [];
    for (let i = 0; i < N; i++) {
      if (seen[i] || mask[i] !== want) continue;
      const id = out.length;
      let area = 0, touch = false;
      const cells = [];
      st.length = 0; st.push(i); seen[i] = 1;
      while (st.length) {
        const p = st.pop(); cells.push(p); area++;
        const x = p % W, y = (p - x) / W;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touch = true;
        for (const q of [p - 1, p + 1, p - W, p + W]) {
          if (q < 0 || q >= N || seen[q] || mask[q] !== want) continue;
          seen[q] = 1; st.push(q);
        }
      }
      out.push({ id, area, touch, cells });
    }
    return out;
  };
  let removed = 0, filled = 0;
  for (const c of comps(1)) if (c.area < MIN_COMP) { removed += c.area; for (const p of c.cells) mask[p] = 0; }
  for (const c of comps(0)) if (!c.touch && c.area < MIN_HOLE) { filled += c.area; for (const p of c.cells) mask[p] = 1; }
  console.log(`masks: ${W}x${H} | 去噪 ${removed}px | 填洞 ${filled}px`);

  if (DEBUG) {
    const buf = Buffer.alloc(N * 3);
    for (let i = 0; i < N; i++) { const v = mask[i] ? 235 : 18; buf[i * 3] = v; buf[i * 3 + 1] = v; buf[i * 3 + 2] = v; }
    await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).resize(900, null, { kernel: 'nearest' })
      .png().toFile('raw-assets/emblem/_mask.png');
    console.log('→ raw-assets/emblem/_mask.png');
  }

  // ---------- 3) 边界追踪 ----------
  const VW = W + 1;
  const key = (x, y) => y * VW + x;
  const edges = new Map(); // 起点 → 终点数组
  const push = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    let arr = edges.get(k);
    if (!arr) { arr = []; edges.set(k, arr); }
    arr.push({ x: bx, y: by, used: false });
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      if (!at(x, y - 1)) push(x, y, x + 1, y);
      if (!at(x + 1, y)) push(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) push(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) push(x, y + 1, x, y);
    }
  }
  // 方向优先级：右转 > 直行 > 左转 > 回头
  const dirOf = (dx, dy) => (dy === -1 ? 0 : dx === 1 ? 1 : dy === 1 ? 2 : 3);
  const PRIORITY = [1, 0, 3, 2]; // 相对入射方向的优先级
  const loops = [];
  for (const [k, arr] of edges) {
    for (const e of arr) {
      if (e.used) continue;
      // 从这条边开始走一圈
      const pts = [];
      let cur = { k, e };
      let guard = 0;
      while (guard++ < N * 4) {
        if (cur.e.used) break;
        cur.e.used = true;
        const ax = cur.k % VW, ay = (cur.k - ax) / VW;
        pts.push([ax, ay]);
        const nx = cur.e.x, ny = cur.e.y;
        const nd = dirOf(nx - ax, ny - ay);
        const nk = key(nx, ny);
        const cands = edges.get(nk);
        if (!cands) break;
        const open = cands.filter((c) => !c.used);
        if (!open.length) break;
        let next = null;
        for (const off of PRIORITY) {
          const want = (nd + off) % 4;
          next = open.find((c) => dirOf(c.x - nx, c.y - ny) === want);
          if (next) break;
        }
        if (!next) next = open[0];
        cur = { k: nk, e: next };
      }
      if (pts.length >= 4) loops.push(pts);
    }
  }
  console.log('loops', loops.length, '总点数', loops.reduce((s, l) => s + l.length, 0));

  // ---------- 4) 平滑 + 简化 + 贝塞尔曲线拟合 ----------
  const smooth = (pts, iter) => {
    let p = pts;
    for (let it = 0; it < iter; it++) {
      const q = p.map((v, i) => {
        const a = p[(i - 1 + p.length) % p.length], b = v, c = p[(i + 1) % p.length];
        return [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
      });
      p = q;
    }
    return p;
  };
  const rdp = (pts, eps) => {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop();
      const [x0, y0] = pts[i0], [x1, y1] = pts[i1];
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      let best = -1, bi = -1;
      for (let i = i0 + 1; i < i1; i++) {
        const d = Math.abs((pts[i][0] - x0) * dy - (pts[i][1] - y0) * dx) / len;
        if (d > best) { best = d; bi = i; }
      }
      if (best > eps) { keep[bi] = 1; stack.push([i0, bi], [bi, i1]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const pre = loops
    .map((l) => rdp(smooth(l, SMOOTH_ITER), DP_EPS))
    .filter((l) => l.length >= 3);

  // ---- 贝塞尔拟合（Schneider：弦长参数化 + 最小二乘控制点 + 递归分裂）----
  const B0 = (u) => (1 - u) ** 3, B1 = (u) => 3 * u * (1 - u) ** 2,
        B2 = (u) => 3 * u * u * (1 - u), B3 = (u) => u ** 3;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const norm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
  const len2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  const chordParams = (pts) => {
    const u = [0];
    for (let i = 1; i < pts.length; i++) u.push(u[i - 1] + len2(pts[i], pts[i - 1]));
    const total = u[u.length - 1] || 1;
    return u.map((v) => v / total);
  };
  const bezPoint = (b, u) => {
    const [p0, p1, p2, p3] = b;
    return [0, 1].map((k) =>
      B0(u) * p0[k] + B1(u) * p1[k] + B2(u) * p2[k] + B3(u) * p3[k]);
  };
  const genBezier = (pts, u, t1, t2) => {
    const p0 = pts[0], p3 = pts[pts.length - 1];
    let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
    for (let i = 0; i < pts.length; i++) {
      const uu = u[i];
      const a1 = mul(t1, B1(uu)), a2 = mul(t2, B2(uu));
      c00 += a1[0] * a1[0] + a1[1] * a1[1];
      c01 += a1[0] * a2[0] + a1[1] * a2[1];
      c11 += a2[0] * a2[0] + a2[1] * a2[1];
      const base = add(mul(p0, B0(uu) + B1(uu)), mul(p3, B2(uu) + B3(uu)));
      const tmp = sub(pts[i], base);
      x0 += a1[0] * tmp[0] + a1[1] * tmp[1];
      x1 += a2[0] * tmp[0] + a2[1] * tmp[1];
    }
    const det = c00 * c11 - c01 * c01;
    let al = 0, ar = 0;
    if (Math.abs(det) > 1e-12) {
      al = (x0 * c11 - x1 * c01) / det;
      ar = (c00 * x1 - c01 * x0) / det;
    }
    const seg = len2(p0, p3);
    const eps = seg * 0.22;
    if (!(al > eps && ar > eps)) {
      // Wu/Barsky 兜底
      const d = seg / 3;
      al = ar = d;
    }
    // 夹紧，避免最小二乘解爆炸导致控制点飞到天外
    const maxA = Math.max(seg * 3, 1e-6), minA = seg * 0.04;
    al = Math.min(maxA, Math.max(minA, al));
    ar = Math.min(maxA, Math.max(minA, ar));
    return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, ar)), p3];
  };
  const maxError = (pts, bez, u) => {
    let max = -1, at = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = len2(pts[i], bezPoint(bez, u[i]));
      if (d > max) { max = d; at = i; }
    }
    return { max, at };
  };
  const reparam = (pts, bez, u) => {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = bezPoint(bez, u[i]);
      // 求最近参数（一步牛顿）
      const d1 = [0, 1].map((k) => 3 * (1 - u[i]) ** 2 * (bez[1][k] - bez[0][k]) +
        6 * (1 - u[i]) * u[i] * (bez[2][k] - bez[1][k]) + 3 * u[i] ** 2 * (bez[3][k] - bez[2][k]));
      const d2 = [0, 1].map((k) => 6 * (1 - u[i]) * (bez[2][k] - 2 * bez[1][k] + bez[0][k]) +
        6 * u[i] * (bez[3][k] - 2 * bez[2][k] + bez[1][k]));
      const diff = [pts[i][0] - x, pts[i][1] - y];
      const num = diff[0] * d1[0] + diff[1] * d1[1];
      const den = d1[0] ** 2 + d1[1] ** 2 + diff[0] * d2[0] + diff[1] * d2[1];
      let un = u[i] - (Math.abs(den) > 1e-12 ? num / den : 0);
      next.push(Math.min(1, Math.max(0, un)));
    }
    return next;
  };
  const out = []; // 曲线列表
  const fit = (pts, t1, t2, depth = 0) => {
    if (pts.length === 2) {
      const d = len2(pts[0], pts[1]) / 3;
      out.push([pts[0], add(pts[0], mul(t1, d)), add(pts[1], mul(t2, d)), pts[1]]);
      return;
    }
    let u = chordParams(pts);
    let bez = genBezier(pts, u, t1, t2);
    let err = maxError(pts, bez, u);
    if (err.max <= FIT_EPS) { out.push(bez); return; }
    // 一次重参数化再试
    const u2 = reparam(pts, bez, u);
    const bez2 = genBezier(pts, u2, t1, t2);
    const err2 = maxError(pts, bez2, u2);
    if (err2.max <= FIT_EPS) { out.push(bez2); return; }
    if (err2.max < err.max) { bez = bez2; err = err2; u = u2; }
    if (depth > 24) { out.push(bez); return; }
    const at = Math.max(1, Math.min(pts.length - 2, err.at));
    const cTan = norm(sub(pts[at - 1], pts[at + 1]));
    fit(pts.slice(0, at + 1), t1, cTan, depth + 1);
    fit(pts.slice(at), mul(cTan, -1), t2, depth + 1);
  };
  const CORNER_COS = Math.cos((CORNER_ANG * Math.PI) / 180);
  let subpaths = [];
  for (const loop of pre) {
    // 环形去尾（首尾重复点）
    const l = loop.slice();
    if (len2(l[0], l[l.length - 1]) < 0.01) l.pop();
    const n = l.length;
    // 找角点
    const corners = [];
    for (let i = 0; i < n; i++) {
      const a = l[(i - 1 + n) % n], b = l[i], c = l[(i + 1) % n];
      const v1 = norm(sub(b, a)), v2 = norm(sub(c, b));
      if (v1[0] * v2[0] + v1[1] * v2[1] < CORNER_COS) corners.push(i);
    }
    if (!corners.length) corners.push(0);
    out.length = 0;
    for (let ci = 0; ci < corners.length; ci++) {
      const s = corners[ci], e = corners[(ci + 1) % corners.length];
      let chain = [];
      for (let k = s; ; k = (k + 1) % n) { chain.push(l[k]); if (k === e) break; if (chain.length > n + 1) break; }
      if (chain.length < 2) continue;
      const t1 = norm(sub(chain[1], chain[0]));
      const t2 = norm(sub(chain[chain.length - 2], chain[chain.length - 1]));
      fit(chain, t1, t2);
    }
    if (out.length) subpaths.push(out.slice());
  }
  const curveCount = subpaths.reduce((s, q) => s + q.length, 0);
  console.log(`曲线段 ${curveCount}（角点阈值 ${CORNER_ANG}°）`);

  // ---------- 5) 归一化 + 输出 ----------
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const grow = (p) => {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  };
  // 用曲线采样点（而非控制点）求包围盒，避免控制点外扩影响缩放
  for (const sp of subpaths) for (const b of sp) for (let k = 0; k <= 12; k++) grow(bezPoint(b, k / 12));
  const bw = maxX - minX, bh = maxY - minY;
  const s = (BOX - PAD * 2) / Math.max(bw, bh);
  const ox = PAD + (BOX - PAD * 2 - bw * s) / 2;
  const oy = PAD + (BOX - PAD * 2 - bh * s) / 2;
  const f = (v) => Math.round(v * 10) / 10;
  const T = (p) => `${f((p[0] - minX) * s + ox)} ${f((p[1] - minY) * s + oy)}`;
  const d = subpaths.map((sp) => {
    let str = `M ${T(sp[0][0])}`;
    for (const b of sp) str += ` C ${T(b[1])} ${T(b[2])} ${T(b[3])}`;
    return str + ' Z';
  }).join(' ');
  // 参考图上的四枚小菱形锚点（源图像素）→ 细框 = 穿过它们的菱形
  const ANCHORS = { top: [223.6, 83.6], left: [101.7, 205.6], right: [345.5, 205.5], bottom: [223.6, 327.6] };
  const TN = (p) => [(p[0] - minX) * s + ox, (p[1] - minY) * s + oy];
  const A = {};
  for (const k in ANCHORS) A[k] = TN(ANCHORS[k]);
  const P = (p) => `${f(p[0])} ${f(p[1])}`;
  const frameD = `M ${P(A.top)} L ${P(A.right)} L ${P(A.bottom)} L ${P(A.left)} Z`;
  const wingsD =
    `M ${f(A.left[0] + 7)} ${f(A.left[1])} L ${f(A.left[0] + 52)} ${f(A.left[1])} ` +
    `M ${f(A.right[0] - 52)} ${f(A.right[1])} L ${f(A.right[0] - 7)} ${f(A.right[1])}`;

  console.log(`bbox ${bw.toFixed(1)}x${bh.toFixed(1)}px → 画布 ${BOX}／缩放 ${s.toFixed(3)}`);
  fs.writeFileSync('raw-assets/emblem/_path.txt', d);
  console.log('path 长度', d.length, '→ raw-assets/emblem/_path.txt');
  if (!DEBUG) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, buildSvg(d, frameD, wingsD));
    console.log('→', OUT);
  }

  function buildSvg(bodyD, frameD, wingsD) {
    // 表现属性全部写进 SVG，颜色走 CSS 变量 → 组件只需在容器上定义变量即可换色
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="crestBody" x1="0.12" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="var(--crest-1, #eaf9ff)"/>
      <stop offset="0.42" stop-color="var(--crest-2, #5cbdf0)"/>
      <stop offset="0.78" stop-color="var(--crest-3, #2f6fd0)"/>
      <stop offset="1" stop-color="var(--crest-4, #1c3f8e)"/>
    </linearGradient>
  </defs>
  <path class="crest-frame" d="${frameD}" stroke="var(--crest-frame, rgba(160,220,255,0.42))" stroke-width="1" pathLength="100"/>
  <path class="crest-wings" d="${wingsD}" stroke="var(--crest-frame, rgba(160,220,255,0.42))" stroke-width="1" pathLength="100"/>
  <path class="crest-body" d="${bodyD}" fill="url(#crestBody)" pathLength="100"/>
</svg>
`;
  }
})();
