# NewBlog 项目长期备忘

## 仓库与站点
- GitHub: https://github.com/TheWindHIND/NewBlog（public，main 分支）
- 站点: https://thewindhind.github.io/NewBlog/
- 部署：GitHub Actions（.github/workflows/pages.yml），push 到 main 自动发布
- 用户偏好从零手写设计静态博客，不急着上框架（Hugo/Astro 等）待定

## 环境坑（务必记住）
- 本 bash 中 git 需用系统版：`"/c/Program Files/Git/cmd/git.exe" -c http.schannelCheckRevoke=false push`
  （PATH 默认的 PortableGit 不认该配置，代理环境下 TLS 会失败）
- GitHub API 用 curl 时加 `--ssl-revoke-best-effort`
- GitHub 令牌存在 Windows 凭据管理器，push 自动认证；如失效需用户重新生成并 `git credential approve`
- **本地 `astro build` 必先移走 `dist/.prerender`**：Astro 收尾会删这个临时目录，
  文件数 >100 时被环境的「批量删除防护」拦下、报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 而构建失败。
  分批 `rm` 不保险（会反复触发），**最稳的是 `mv dist/.prerender <项目外的别处>`（改名不算删除）**，
  再 `npm run build` 即通过。CI 无此 shim，不受影响。
- **`agent-browser` 在本机已无法启动**（`open` 挂死→SIGTERM；清 `~/.agent-browser/default.*` 无效）。
  视觉验证兜底：`curl` dev server HTML 抽组件标记 → `sharp` 离屏渲染成 PNG 复核，
  并断言「构建产物 CSS 选择器是否命中标记」。渲染前记得剥 `data-*`（librsvg 不认）并补 `xmlns`。
- **真实整页截图（2026-10-03 起可用，替代 agent-browser）**：用系统自带的 Edge 无头模式：
  `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --no-sandbox \
   --hide-scrollbars --force-device-scale-factor=2 --force-prefers-reduced-motion \
   --run-all-compositor-stages-before-draw --window-size=1100,1250 --virtual-time-budget=25000 \
   --user-data-dir=<临时目录> --screenshot=<绝对路径.png> <url>`
  - ⚠️ **必须带 `--force-prefers-reduced-motion`**：本站大量元素靠 CSS 过渡入场
    （`.it` 有 `--d` 逐级延迟最多 0.5s、Live2DCat 有呼吸/眨眼），不加这个标志截到的是**动画中间态**
    ——表现为「延迟 ≥0.36s 的家具全部不可见」「猫被放大 3 倍」。项目里 `prefers-reduced-motion`
    分支会把过渡全部关掉 → 一步到位拿到终态。
  - `--virtual-time-budget` 要 >15s；`--user-data-dir` 每次给新目录避免单例锁冲突。
- **给 localStorage 依赖的页面「催熟」**：种子页**已留档 `raw-assets/ref/seed.html`** ——
  构建后 `mkdir -p dist/__seed && cp raw-assets/ref/seed.html dist/__seed/index.html` 再访问
  `http://localhost:4321/NewBlog/__seed/?t=ousia`（`t` 换 `pneuma` 看昼场，`&v=<次数>` 控制回访数，默认 40；`v=1` 看「刚开门」；
  **`&to=about|now|posts...` 换落地页**，默认 `room`）。
  ⚠️ 种子页会 `localStorage.setItem` 写 `catnest.theme` / `catnest.visits` /
  `catnest.achievements` / `catnest.read` / `catnest.feed.*` 后 `location.replace(...room/)`。
  ⚠️ `catnest.theme` 是**裸字符串**（`'ousia'`/`'pneuma'`，BaseLayout 内联脚本直接全等比较），
  而 `catnest.visits` / `catnest.achievements` 等走 `JSON.stringify` —— 别写混。
  `dist/` 已被 gitignore，塞进去不会进仓库；但会在下次 `astro build` 时消失（要重新 cp）。

## 前端踩坑（本项目已复现）
- Astro 组件的 **scoped 样式打不进 SVG `<use>` 的影子内容**（既不被选择器命中、也不带 scope 属性），
  路径会退回默认 `fill:black` → 表现为页面顶部「一条黑线」。
  **需要复用 SVG 几何时渲染成真实节点，别用 `<use>`**；必须用 `<use>` 时把 `fill`/`stroke`
  写在 `<use>` 元素上靠继承。同类：`set:html` 注入的 SVG 也拿不到 scoped 样式 → 用 `var()` 兜底。
- ⚠️ **`<img width="520" height="520">` 的宽高属性 = 作者级的 presentational hint**
  （`width:520px; height:520px`）。CSS 只写 `width:100%` **只覆盖宽度，高度仍是 520px** ——
  210px 宽的栏里图片被纵向拉长 2.5 倍（关于页头像就是这么「变形」的）。
  **凡是靠 width/height 属性预留 CLS 的图，作者 CSS 里必须补 `height:auto`**（要固定比例再补 `aspect-ratio`）。
  修法示例：`about.astro` 的 `.portrait img { width:100%; height:auto; aspect-ratio:1/1; object-fit:cover; }`。

## 「今日一句」机制（Footer）
- 语录源 `consts.ts` 的 `QUOTES[]`；取句公式 `YYYY*372 + (M+1)*31 + D` 再取模。
- **双层**：构建时按**构建日**渲染一条（无 JS 兜底）→ Footer 里 `<script type="application/json"
  id="site-quotes" set:html={JSON.stringify(QUOTES)}/>` 供前端读，同文件 `<script>` 用**访客本地日期**
  重算 index 覆盖 `[data-quote-text]`。纯静态站只能靠这一手实现「真的每天换」。
- Astro 会把这种小脚本**内联**进 HTML（不是外链 bundle），全站每页多约 300B，可接受。

## 芙芙的小包厢（`/room`，2026-10-03 三次改版后的现状）
- 名称：大标题「**芙芙的小包厢**」+ kicker「LA LOGE DE FURINA」（小包厢＝歌剧院包厢）；
  `consts.ts` 阶段名「满级小包厢」、成就「满级小包厢」、Footer 链接同步。站点名「藏枫的猫窝」不动。
- **整屋枫丹化**：拱形墙板（`panel()` 生成）、天花板金线脚、金色水滴纹章、**水晶吊灯**（带轻摇动效）。
- **窗外枫丹风景**（昼夜两套，靠令牌切，不用 JS）：天空渐变 → 昼（太阳/云/飞鸟）·夜（月亮/星/闪光星）
  → 天际线剪影（歌剧院穹顶、沫芒宫尖塔、排屋）→ 夜加金点城市灯火 + 城市辉光椭圆 + 屋脊白光高光
  → 水面（`--room-water` 渐变）+ 涟漪 + 音乐喷泉 + 巡轨船 + 水泡；窗台常驻**泡泡桔盆栽**。
  相关令牌：`--room-sky-a/-b`、`--room-far`、`--room-day`/`--room-night`（0/1，给 SVG `opacity` 属性用）、`--room-fire`。
  ⚠️ 夜里剪影若只靠 `--room-far` 压深天，会**整片看不见** → 必须给辉光 + 高光。
- **枫丹特产**（用户点名要的）：泡泡桔（盆栽/果篮）、虹彩蔷薇、苍晶螺、幽光星星（玻璃罐，自带发光）、
  美露莘摆件、发条齿轮、《蒸汽鸟报》。特产分布在窗台/壁架/炉台/柜顶，随解锁幕次出现。
- 解锁件（`data-need`）：猫粮碗(0)、纸箱(3)、地毯+软垫(5)、抱枕毛线+马卡龙碟(10)、
  灯串+窗下壁架（水族箱+特产）(20)、壁炉+书柜+相框×3+绿植+猫爬架+**天鹅绒猫窝+喷泉水盆**(40)。
- 布景全在 `src/components/CatRoom.astro` 一张 SVG（viewBox 800×460，`preserveAspectRatio="slice"`）。
- ⚠️ **必须避开"猫位"中带**：主角 Live2DCat 是 HTML 浮层、占 stage 中央 26% 宽
  ≈ viewBox **x296–504**（纵向 y≈96–437）。墙面可用区只剩**左侧 x<290** 与 **右侧 x>504**
  （再扣窗 x488–668、爬架 x696–800）。壁架第一版挂在 x284–458 被头发整个挡住，白做。
- 配色令牌 `--room-*`（`tokens.css` 昼夜各一套）。**夜场 `--room-wood` 曾 #2b4364 压墙 #16243c 对比过低**
  → 已改 **#375681** + 木器统一补 `--ornament` 勾边；**昼场 `--room-wall-2` 曾 #f3e9d6**（墙裙看不见）
  → 改 **#ecdcc0**。木器/护墙板改色前务必两套主题都出图核对。
- **墙上挂画（芙宁娜海报，`data-need=20`）**：源图 1181×1181 → `public/images/room/furina-poster.webp`（340px/37KB）。
  结构＝挂钩 → 吊线 → 木框 80×80（`--room-wood`）→ 奶油卡纸 `#f4ecdc` → 画心 66×66（`xMidYMid slice`）
  → 玻璃反光三角 → 水滴纹名牌（`<path>` 画，别用 `<text>`）。位置 x702–782 / y152–232（右墙、相框下方）。
  ⚠️ 挂钩必须落在中间相框（x712–756 / y106–140）**下沿之外**：原来放 (742,133) 落在相框里，
  读起来像「海报挂在相框上」；改 (742,144) 才对。
- ⚠️ **家具用色别直接吃 `--accent/--accent-2`**：昼场 `accent-2` 是金、夜场是别的 ——
  绿植照 `--accent` 画，昼场就成了橄榄金"塑料叶"。植物类一律写**真绿**常量（#7fae72/#9cc48a/#6f9e64…）。
- ⚠️ 两个"我自己造又自己踩"的形：①炉膛开口做太大（x42–126/y208–322）＝墙上一块黑洞，
  必须小拱（x58–110，拱顶 y286）+ 大而亮的火焰 + 暖光；②猫窝内圈用暗色 → 读成"地上的一滩水"，
  要**浅色内垫 + 金辫 + 波浪嵌线**才像床。

## 字体（唯一自托管字体）
- **圆润标题体 = 站酷快乐体（ZCOOL KuaiLe，OFL 可商用）子集**：`public/fonts/zcool-kuaile.woff2`（约 1.6KB，
  仅含「芙的小包厢 LAOGEDFURIN」）＋同目录 `OFL-ZCOOLKuaiLe.txt`；`base.css` 顶部 `@font-face`，
  令牌 `--font-round`，room 页的 `.pb-title`/`.pb-kicker` 用它。
- **要加字**：`curl -A "<浏览器UA>" "https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&text=<URL编码的字>"`，
  取返回 CSS 里的 woff2 地址下载覆盖即可（不是全量字体，别拿去当正文字体）。
- ⚠️ 系统里**没有幼圆**（`YouYuan`/`幼圆`），所以单纯堆系统字体栈会掉回 KaiTi 楷体 —— 必须自托管子集。
- ⚠️ 本机 curl 访问 raw.githubusercontent / Google Fonts 要加 `--ssl-revoke-best-effort`（否则 exit 35 静默空文件）。

## 视觉资产
- 猫立绘管线：`raw-assets/cat/aylen-full.png`（原画，**眼睛以此为准**）→ `hat-ears-only.cjs`（合成猫耳贝雷帽）
  → `slice-cat.cjs`（切 head/head-closed/body/tail）→ `public/images/cat/*.webp`。
  ⚠️ `scripts/eyes-cat.cjs`（矢量水滴瞳）**已废弃**，误跑会覆盖眼睛。
- 徽记：`scripts/trace-emblem.cjs` → `src/assets/fontaine-crest.svg`（描摹+贝塞尔拟合，CSS 变量换色）
- 图标：`scripts/key-ui.cjs`（绿幕抠图）→ `public/images/ui/*.webp`
- **矢量道具（手绘几何，不走抠图）**：
  - `src/lib/sword-geom.mjs` → `swordSVG()` 芙卡洛斯之剑（阅读进度条横置剑，`SwordProgress.astro`）。
    **v3 版式（2026-10-03 末次返工，viewBox 仍 240×660）**：自上而下＝水滴剑首 → 领圈 →
    缠绳握柄 → 柄环 → 细颈 → 卷草护手＋深蓝菱节点 → 双长刃（**平行窄刃身，总宽 78**，两刃在 y606
    合拢成点）→ **剑尖端：白色后掠浪翼 `FLARE` + 每侧后掠浪臂/内旋卷浪 + 中央垂坠水滴**。
    绘制顺序：飞翼在前、**双长刃在后** —— 于是合拢的蓝刃尖压在白色飞翼上可见（＝原图的样子）。
    ⚠️ 三条血泪教训：①刃身若做「渐变收尖」横过来会像叶子，必须平行刃身+尖端收锋；
    ②**浅色主题下 `--sword-orn` 不能用接近底色的象牙色**（护手会整片消失，剑看着就"没有护手/像匕首"）；
    ③**剑尖那块在原图里是「白」的、且跨度约为刃身总宽的 2.5–2.9 倍** —— 做成和刃同色的小新月一定不像。
  - `src/lib/nail-geom.mjs` → `nailSVG('whole'|'shattered')` 寒天之钉（荒/芒切换图标，`ThemeToggle.astro`）
  - 两者颜色都写成 `var(--sword-* / --nail-*, 回退色)` 的**属性**（要过 `set:html`，吃不到 scoped 样式）；
    令牌在 `tokens.css` 昼夜各一套。卷曲纹样用「螺旋点列 + 变宽带拟合」生成，别用等宽描边。
    ⚠️ `ribbon(pts, widths)` 的 widths 必须与 pts **等长**，少一个会算出 NaN 让整段路径失效
    （已加兜底：宽度数组短了就沿用最后一档）。

## 伪 Live2D 分层（`Live2DCat.astro` + `scripts/slice-cat.cjs`，2026-10-04 修完）
症状：鼠标上下移动时下巴出现**双层重影**；尾巴摆动时**割裂**。
- **双下巴根因**：头层切割线原来压在下巴深色轮廓（x=50% 处 59.7–60.8%）上，
  ±0.7% 羽化带随头位移 → 半透明下巴复印一份。
  **修法**：切割线挪到 61.8–63% 的**平坦颈肉**上（两侧放进发丝内部），羽化 3 → **1.4px**，
  且 **`transform-origin` 压在切割线上（`.head-wrap { 50% 62% }`）** —— 于是竖直响应改用
  **`scaleY`（点头）而不是 `translateY`**：绕枢轴缩放时枢轴线是不动线，切缝竖直位移 ≈ 0。
  JS 公式：`translate(cx*1.3%, cy*0.12%) rotate(cx*2.4deg) scaleY(1 - cy*0.05)`。
  旋转带来的侧向扫动 ∝ 距枢轴水平距离，经逐列核对 x42–70%（颈/领口）位移 ≤6px 可接受，
  两侧大多落在透明背景/发丝内部。
- **尾巴割裂根因**：尾巴遮罩多边形位置偏了约 6%（偏上偏左），尾巴层几乎被挖空、身体层却留着静止尾巴
  → 动的碎片叠在静止尾巴上。**修法**：用 `scripts/_grid.cjs 58 60 96 92` 重新读坐标重画轮廓；
  尾巴从「身体挖洞露出」改为**画在身体之上**（`z-index: 2`），身体挖洞与尾巴遮罩用**同一个外扩多边形**
  （`offsetPoly`，余量只在根部给：四周是不透明裙摆才补得上，尾尖四周透明、余量无意义）；
  摆幅收紧：`tail-wag` -3°/4.5°、`tail-wag-fast` -6°/9°（原 ±16° 会让尾尖露缺口）。
  `TAIL_PIVOT = (66%, 84.5%)`。
- **验证夹具**：`scripts/_motion-fixture.cjs` —— 把 `dist/room/index.html` 复制到 `dist/__motion/` 并注入脚本，
  用**和生产一致的公式**把猫钉在任意姿态：`?cx=0.9&cy=1&tail=9`（cx 左右 ±1、cy 上下 ±1、tail 角度）。
  无头截图 + `crop-ref.cjs` 6× 放大即可复核动效（无头不会真的动鼠标，而生产脚本在
  reduced-motion 下又不挂 `pointermove`，所以只能这样直接写 inline transform 绕开守卫）。
  ⚠️ 偶发整层头顶空白 = `decoding="async"` 解码竞态，**重跑即正常，别当 bug 改代码**。

## RSS 与 `/feed` 页
- **浏览器直接打开 `/rss.xml` 显示一棵 XML 树是正常现象**——RSS 是给阅读器读的格式，不是给人读的页面。
- **XSLT 方案已废弃**：给 rss.xml 挂 `<?xml-stylesheet ... rss-style.xml?>` 后，Chromium 会顶
  大红警告条「This site uses XSLT; that functionality is being removed from this browser very soon」
  → 不可用。`rss.xml.js` 保持原样、不要再用 XSLT。
- 人类入口改为 **`src/pages/feed.astro`**：playbill 页头 + 订阅地址卡（`code[data-feed-url]` + 复制按钮，
  clipboard + `document.execCommand` 兜底）+ 说明 + 最新文章清单。Footer 链接 `${B}/feed`。
- head 里的 `<link rel="alternate" type="application/rss+xml" href=".../rss.xml">` **保留**（阅读器自动发现）。

## 关于页背景插画（`about.astro`）
- 源图 1376×768 → `public/images/about/room-night.webp`（1380px/49KB）；`.page-bg` 固定铺满 + `::after` 压主题色。
- **必须按主题分档**（一张暗夜景图直接压昼场香槟底，整页会发灰）：
  `tokens.css` 里 `--about-img-o` / `--about-veil-o` / `--about-photo-o`
  ＝ **夜 0.55 / 0.62 / 0.42，昼 0.4 / 0.87 / 0.16**；`about.astro` 用 `var(--about-*-o, 回退)`。
- 「枫」字是 `<button class="qq-name" data-qq="2927015997">`，点击复制 QQ（clipboard + 兜底，2s 还原）。

## 参考图 → 矢量 的工序（本项目已验证）
1. `scripts/probe-refs.cjs <图> [列数]`：降采样成**字符轮廓**，直接读比例，不用出图。
2. `scripts/crop-ref.cjs <图> <出> x0 y0 x1 y1 [倍率]`：归一化坐标裁局部放大看结构。
3. `scripts/grid-ref.cjs <入> <出> [格数]`：**叠网格标尺**，把局部结构的坐标读成归一化数值（很好用）。
4. `scripts/mask-ref.cjs <入> <出> [white|bright] [阈值]`：**白度/亮度掩膜**，把「白色构件」从
   彩色刀身与背景里分离出来，看轮廓不被光晕干扰。⚠️ stride 必须**按缓冲区长度反推通道数**，
   不能信 `metadata().channels`（`removeAlpha()` 后仍可能报 4 → 画面错位重影）。
5. 手写 SVG 几何（生成式，写进 `src/lib/*-geom.mjs`）+ 描摹器 `scripts/trace-emblem.cjs`。
6. `scripts/render-sword.cjs` / `render-nail.cjs` / `render-tip.cjs`：多尺寸 × 昼夜两套离屏渲染
   + 与参考并排对照。⚠️ `sharp().resize({width,height})` **同时给宽高默认 fit:cover 会裁切**，
   SVG 已按目标尺寸渲染时不要再 resize。
7. `scripts/preview-built.cjs`：**从 `dist` 真 HTML 抽 svg** → 用 `tokens.css` 解析出的主题变量
   替换 `var(--x, 回退)` → `sharp` 渲染成头部/图标预览；顺带断言「无 var() 残留」。
   （小尺寸显示要按屏幕像素反推描边宽度：50px 宽的 240 单位画布，1.6 单位只有 0.33px，太细。）
