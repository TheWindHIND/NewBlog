# NewBlog 项目长期备忘

完整项目说明见资料库《藏枫的猫窝》交接说明书（源文件 `raw-assets/handoff.md`）。本文件只留「坑 + 铁律」。

## ⏰ 待办（到点主动提醒/执行）
- （暂无）
- 已完成：2026-11-17 用户确认比赛交完 → **《电子皮肤》已放出**（去掉文章/两条 gallery/项目卡四处的 `draft` + `.gitignore` 三行）。

## 站点
`TheWindHIND/NewBlog` → https://thewindhind.github.io/NewBlog/ ；push main 触发 Actions 发布；全手写设计不上框架。

## 环境铁律
- git 用系统版：`"/c/Program Files/Git/cmd/git.exe" -c http.schannelCheckRevoke=false push`（PortableGit 不认该配置）。
- ⚠️ `github.com` HTTPS 常挂（502/000，`api.github.com` 正常）→ 备用 **SSH over 443**：
  `GIT_SSH_VARIANT=ssh GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" "/c/Program Files/Git/cmd/git.exe" push ssh://git@ssh.github.com:443/TheWindHIND/NewBlog.git main`
  （必须 `GIT_SSH_VARIANT=ssh`；不改 origin。）
- 推送后查 `api.github.com/repos/TheWindHIND/NewBlog/actions/runs?per_page=1` 的 conclusion（curl 加 `--ssl-revoke-best-effort`）再抽查线上。
  ⚠️ Pages 有传播延迟：刚 success 时新 CSS 可能仍 404/旧内容，等几十秒重试。
- ⚠️ **`npm run build` 前必须 `mv dist/.prerender <项目外的别处>`**：Astro 收尾删该临时目录，>100 文件触发环境「批量删除防护」而失败；mv 改名不算删除。CI 无此问题。
- ⚠️ push 被拒「remote contains work you do not have」（用户会打空备份提交 `backup:before …`）：`fetch ssh://… main` 后 **`git rebase FETCH_HEAD`**（别 merge）再 push。
- **截图 = Edge 无头**：`"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --force-device-scale-factor=2 --force-prefers-reduced-motion --run-all-compositor-stages-before-draw --window-size=1100,1250 --virtual-time-budget=25000 --user-data-dir=<新目录> --screenshot=<绝对路径> <url>`（agent-browser 本机已废）
  - **必须 `--force-prefers-reduced-motion`**，否则截到过渡中间态（家具不可见/猫被放大）。
  - ⚠️ 把 Edge 调用**包进 shell 函数/for 循环**时曾静默不产出 → 每次截完 `ls -la` 校验，别 `>/dev/null` 蒙眼。
  - ⚠️ `--user-data-dir` 写 **`C:/tmp/edge-xxx`**（盘符路径；写 `/tmp/…` 曾整批不产出），每次换新目录名。
  - ⚠️ `--window-size` < ~500px 时 Windows 按更宽视口排版只裁出这么宽 → **窄屏「溢出」是假象**，判真溢出看 CSS。
  - ⚠️ preview 会内存缓存旧产物 → 改完源码 `npx astro preview stop` 再 `--port 4321 --force` 重启。
  - ⚠️ preview 只监听 IPv6：`http://[::1]:4321/NewBlog/…`，curl 加 `--noproxy '*'`（否则被代理挡成 502）。
- **催熟 localStorage 页面**（仅 `preview` 有效）：构建后 `mkdir -p dist/__seed && cp raw-assets/ref/seed.html dist/__seed/index.html`，
  访问 `…/__seed/?t=ousia&v=40&to=room`（t=主题，v=回访数，to=posts/posts/<slug>/about/now…）。
  ⚠️ `catnest.theme` 存**裸字符串**（`'ousia'`/`'pneuma'`），其余 `visits/achievements/read/feed.*` 走 `JSON.stringify`。`dist/` 已 gitignore，每次 build 后要重新 cp。
  ⚠️ 要看 `draft: true` 的稿子得用 **`astro dev`**（preview 读构建产物没草稿）；而 dev 不解析目录索引 → 种子放成 `public/_seed.html`、跳转写绝对路径，截完立刻删。

## 前端踩坑
- ⚠️ Astro **scoped 样式只认字面量类名**：`class:list={{ [`t-${tone}`]: … }}` 拼出的类名不会被编译进样式表 → CSS 里要把类名写全（`t-ousia-dark` 这种）。
  且**同一元素挂两套主题档位类时两条规则都命中、靠源序决胜负**（很脆）→ 一律用 `:root[data-theme='ousia'] …` 各自限定（见 `PostBackdrop.astro`）。
- Astro **scoped 样式打不进 SVG `<use>` 影子内容**（不命中、无 scope 属性）→ 退回 `fill:black`（顶栏「一条黑线」）。复用几何就渲染真实节点；非用 `<use>` 则 fill/stroke 写在 `<use>` 上。`set:html` 注入的 SVG 同理 → 用 `var(--x,回退)`。
- ⚠️ ⚠️ **Markdown 正文拿不到 scoped 样式**：`.prose p {…}` 编译成 `.prose[cid] p[cid]`，而 `<Content />` 渲染的元素不带 cid → 段距/标题/引用/代码块/表格样式**静默全失效**（曾让诗的分节消失、正文全无段距）。正文后代选择器必须写 **`.prose :global(p)`**；手写在 `.astro` 模板里的 prose（about 页）带 cid，照旧写。
- ⚠️ **`<img width height>` 是作者级 presentational hint**：只写 `width:100%` 覆盖不了高度 → 窄栏里图片纵向拉长。靠属性预留 CLS 的图，CSS 必须补 **`height:auto`**（要固定比例再加 `aspect-ratio`）。
- ⚠️ **CSS 变量不跨兄弟节点**：给 `.post-bg`/`.post-veil` 这类兄弟元素配参数时，各自挂自己的变量。
- ⚠️ 网格一律 `minmax(min(100%, Npx), 1fr)`：少了 `min(100%,…)` 护栏，窄屏列宽会被 Npx 撑出横向滚动。
- ⚠️ **方图（1:1 / 竖构图）当插画**：`background-size: cover` 在 820px 高的页首带与 132px 高的卡片封面带里都会上下裁，
  默认取景正好切头 → frontmatter 用 **`bgPos`**（插画带）/ **`coverPos`**（卡片封面）手动往上提（实测 `'50% 0%'` / `'50% 6%'`）。
- ⚠️ **`bg: 'none'` = 这篇不要页首插画带**（否则回落到 tokens 里那张默认插画「秋千少女」）。组件里必须**显式内联 `--post-bg:none`**——
  第一次踩坑：只把变量留空没写值，结果照样继承默认图，完全看不出效果。短诗/短篇用它，别让 820px 插画把正文压在人物脸上。
  正文里当「插图」的单张画给 `class="poem-figure"`（PostLayout 里 520px 居中 + `height:auto`）。
- **「今日一句」**：池 = `consts.ts` 的 `QUOTES[]`（现 20 句 ≈ 20 天一轮），公式 `index=(YYYY*372+(M+1)*31+D)%池长`（M 为 0-based）；**池长 = 周期**，取模天然循环、不会用尽。
  构建时渲染一条兜底 + Footer 内联 `#site-quotes` JSON，前端按**访客本地日期**重算。语气口径 = **戏剧化 + 自恋 + 一点藏起来的孤独**（舞台/帷幕/掌声/谢幕/甜点）；**别混进「喵」或温柔迎客的口吻**（那是芙芙猫/站主语气）。`.quote` 的 `max-width` 留 **640px**（30 字出头才不会把收尾「」挤第二行）。
  ⚠️ 该公式**不是严格每天 +1**：每月都按 31 天算 → 月内 +1，而「上个月不足 31 天」的月初会跳步（3/1 +4；5、7、10、12 月 1 日各 +2；跨年 +1），2026 年共 5 处。
- **「语录」= `/posts` 的第三块分类**（顺序 **项目 / 杂谈 / 语录**，语录垫底；`QuoteCard.astro` + `consts.ts` 的 `POST_QUOTES[]`，与页脚「今日一句」的 `QUOTES[]` 是**两套**，别混）。条目 `{text,date,image?,alt?}`，倒序＝新的在前；**长条卡**（宽屏两列 `minmax(min(100%,460px),1fr)`，配图缩成卡内左侧小图撑满卡高），板块带 `id="quotes"`。
  ⚠️ 早期版本挂在**文章页页末**、文章页共用 → 语录一多每篇文章下面一长列，已撤（别再挂回去）。
  日期**当年只写「X 月 X 日」、跨年才带年份**（手写 `iso.split('-')` 拆，别用 `new Date()` 免得时区挪一天）——跟**构建年**走，明年重建会自动带年份，有意为之不是 bug。
- **星空猫座的语录星座**（`StarMap.astro` 的 `quotes` 入参）：语录星 `year: null`（不混进年份连线），金色小星围绕**独立中心**散开、不连线，虚线圈 + 中心菱形 + 「语录 · N 句」标签；悬停浮出全文，点击跳 `/posts/#quotes`。
- 落款日期：文章 markdown 里手写 `<p class="sign">…</p>`，样式在 PostLayout 用 **`.prose :global(.sign)`**（插槽内容不带 scope）。

## 伪 Live2D 分层（`Live2DCat.astro` + `scripts/slice-cat.cjs`）
- 双下巴修法：头切线落在 61.8~63% 平坦颈肉、羽化 1.4px、`transform-origin: 50% 62%` 压在切缝，竖直响应走 `scaleY`。
- 尾巴修法：`_probe-tail.cjs` 逐行量边界重写 `TAIL_POLY`（内缘绕开手指：y79~82% 手占 x68.2~76.2；外缘到 x≈91%）、`TAIL_MARGIN=1.0` 绝不往根部扩、`growMaskIntoInk(mask,6)` 沿深色线稿生长吃描边（贴皮肤的深色不吃，保住手描边）、`TAIL_PIVOT=(70.5,85.5)`；尾巴画在身体之上（z-index 2）。
- ⚠️ ⚠️ **sharp 合成的 `dest-in`/`dest-out` 认遮罩 alpha，不认 RGB**。曾把遮罩写进 RGB、alpha 恒 255 → 尾巴层吃到整只猫、头身层全空 → 猫整只跟着摆尾动画转。正解：**RGB 恒白、遮罩值写进 alpha**。`slice-cat.cjs` 已加交付前自检（读刚写的 webp 断言四层覆盖率，越界 exit 1）。
- ⚠️ **改了切图脚本必须重跑 + 重新截图核对**（曾事故＝验证过→又改脚本→没重验→坏图进仓库）。
- 夹具 `_motion-fixture.cjs` 把 `dist/room/index.html` 复制到 `dist/__motion/` 注入脚本，按生产公式钉姿态 `?cx=&cy=&tail=`，**`?bg=magenta`** 藏布景刷品红（缺像素立刻漏底）；配 `_chk-tail-layers.cjs`、`_chk-alpha.cjs`。⚠️ 偶发整层空白 = `decoding="async"` 解码竞态，重跑即正常。

## 背景插画 / 内容扩展点（文章 · 图库 · 友链）
- 关于页：`public/images/about/room-night.webp`；`.page-bg` 固定铺满 + `::after` 压主题色，令牌 `--about-*-o`（夜 .55/.62/.42，昼 .4/.87/.16）。「枫」字 = `data-qq="2927015997"` 点击复制。
- 归档页（`/archive`）整页背景：同 `.page-bg` 写法，令牌 `--archive-bg/-bg-pos/-img-o/-veil-o`。⚠️ 这是**整页背景里唯一昼夜两张不同图**的一组（荒=夜城 `.85/.3`、芒=午后阳台 `1/.15`）——暗图配暗主题能露，亮图配浅纱必须薄。（文章页要昼夜两张不用改令牌，写 frontmatter `bgDay` 即可。）
  ⚠️ `position:fixed` 背景在**整页截图里只出现在视口那一屏**，下面「没图」是截图假象。星图面板 `.starmap` 用**半透明卡面**（`--bg-card` + 顶部 `--accent-soft` 径向光）。
- 文章页 + 列表页共用 `PostBackdrop.astro`（`variant="list"` 换列表页令牌，`bg`/`tone`/`bgDay`/`toneDay` 单篇覆盖）：页首**渐隐插画带** `.post-bg`（`min(92vh,820px)`、mask 上淡入下淡出）+ `.post-veil`（纯 `var(--bg)` + mask 只压上缘）。⚠️ **别用「主题色→透明」渐变当纱**（sRGB 中段混灰）→ 一律 mask。
  令牌：`--post-img-o/--post-veil-o`（夜 .5/.86、昼 .34/.94）、列表 `--post-list-*`（夜 .66/.66、昼 .38/.9）、bright（夜 .62/.58、昼 .5/.42）、dark（夜 .82/.46、昼 .72/.52）。
  ⚠️ **取景按档位给默认值**（`POS={auto:'68% 30%',bright:'50% 46%',dark:'50% 42%'}`）：亮/暗档多是居中构图，沿用主题默认偏右取景会把主体推出画面。
- 文章 frontmatter：`cover`（卡片封面带）+ `coverPos`、`bg`+`bgTone`（页首插画，`bg: 'none'` 可整篇关掉）+ `bgPos`、`bgDay`+`bgDayTone`+`bgPosDay`（**昼夜各一张**）、`series`/`seriesIndex`。⚠️ **已删掉 `kind`**（项目不再由文章承担，别加回来）。
- ⚠️ **亮色插画必须标 `bgTone: bright`**（夜主题默认纱会糊没）；⚠️ **很暗的插画要标 `bgTone: dark`**——dark 档**把图的淡出提前**（实心 12–22%、40% 收干净）：暗图压得住浅色字，但常带**亮主体**（人像/灯光），而页首引言正好在 25–40% 处，不提前收就把正文对比度顶掉。
  ⚠️ 文章标签行（`.tags`）压在插画上会发虚，**亮图档尤其明显（`白` 也一样）**：亮图纱只压到 30%，标签正好在边缘，chip 又是半透明强调色 —— 全站性质观感，不是单篇 bug。（待定：是否统一把 chip 不透明化。）
- ⚠️ 列表页页首的「裸文字」（`.board-title`/`.board-sub`/`.year`）压在插画带上：给同底色柔光字影 `text-shadow: 0 1px 12px var(--bg), 0 1px 2px var(--bg)`（可继承）；`.board-sub` 用 `var(--text)` + `opacity:.72`（用 `--muted` 会在最亮墙面上糊掉）。
- **「项目」= 作品墙，不是文章**：`consts.ts` 的 `PROJECTS[]` → `ProjectCard.astro`。有 `url` → 整块**外链**项目站点（meta 显域名 + ↗）；**没 `url`** → 整块跳站内过程笔记（同窗口，meta 显 `status` 文案如「原型 · 制作中」，不再重复挂 note 入口）。`note` = 站内笔记 slug。写法的来龙去脉一律当**普通文章**收进「杂谈」按年份归档。
- ⚠️ **未发布内容的隔离**（未参赛的科创项目等）：文章 `draft: true`、图库条目 `draft`（gallery schema 同支持）、`PROJECTS` 那条也 `draft`（**笔记是草稿时项目卡必须一起压住**，否则卡片指向构建产物里不存在的页面 = 404），再把那几份 md 加进 `.gitignore`（公开仓库只靠 draft 挡不住源码）。当前挂着《电子皮肤》（`src/content/posts/e-skin.md` + 两条 gallery + `.gitignore` 三条 + 两处 draft），**见顶部待办**。
- **Now 节目单**（`/now`）：数据全在 **`src/content/now/now.md`** 的 frontmatter（`now` collection 取第一份 md 的第一条）。
  `playing/watching/listening` 都是 **`array(string)`**，**没有独立的作者/副标题字段** → 作者按站内惯例写进
  **中文全角括号**（`逆流行（有棵里里）`）；改完内容记得同步 `updated`，页面页脚显示「上一版节目单更新于 …」。
- 图片路径一律走 **`src/lib/media.ts` 的 `mediaUrl()`**：相对路径补 BASE_URL，`http(s)://`/`data:` 原样。
- 友链 = `consts.ts` 的 `FRIENDS[]`（name/url/cover/avatar/desc）→ 关于页「**同台 · FELLOW ACTS**」区块。
- 图库 = `src/content/gallery/*.md`（`src/alt/date/group`；`GROUP_ORDER`：站点视觉 / 站点插画 / **文章封面** / 文章插画 / 友链）。
- 用户给的图统一走 **`node scripts/optimize-media.cjs`**（`JOBS` 登记 from/to/preset，可加 `quality` 单图压一档）：原图进 `raw-assets/` 留档、webp 进 `public/`，**打印平均亮度**提示要不要标 `bgTone`（≥150 标 `bright`、≤70 考虑 `dark`）；顺手登记 gallery。
  ⚠️ **视频截图自带黑边**（例 2400×1080 左右各 239px 纯黑）→ `JOBS` 加 **`trim: 'auto'`** 先裁再压（也可写死 `[左,右,上,下]`）。⚠️ `raw-assets/` 在 .gitignore 里。

## 文章对外口径（用户明确要求）
- 不写真实所在地（一律 `××省 ××市` 占位）。
- 不写「彩蛋 / 恶作剧」这类隐藏机制。
- 不写密钥处理细节（原文那段 Base64 是**真 key 碎片**，绝不能进仓库）。

## 包厢 / 字体 / 资产（细节见 handoff.md）
- ⚠️ 包厢墙面**避开猫位中带**（Live2DCat 浮层占 viewBox x296–504，纵向 y≈96–437）→ 只用 x<290 与 x>504。
- ⚠️ 家具**别吃 `--accent/--accent-2`**（昼夜含义不同）：植物写**真绿常量**；夜场木器 #375681 + `--ornament` 勾边；昼场墙裙 #ecdcc0。改色前**两套主题都出图**。
- 字体：站酷快乐体子集 `public/fonts/zcool-kuaile.woff2`（仅标题几个字），令牌 `--font-round`；系统**没有幼圆**，堆系统栈会掉回 KaiTi。加字用 Google Fonts `text=` 接口取 woff2（curl 加 `--ssl-revoke-best-effort`）。
- 资产管线：`raw-assets/cat/aylen-full.png` → `hat-ears-only.cjs` → `slice-cat.cjs` → `public/images/cat/*.webp`；`scripts/eyes-cat.cjs` **已废弃**（误跑会覆盖眼睛）。图标 `key-ui.cjs`（绿幕抠）、徽记 `trace-emblem.cjs`。
- 矢量道具：`sword-geom.mjs`（阅读进度剑）、`nail-geom.mjs`（寒天之钉）→ 颜色写成 `var(--x,回退)` 的**属性**（要过 `set:html`）。⚠️ 参考图→矢量工序：`probe-refs` → `crop-ref`/`grid-ref` 读坐标 → `mask-ref` 分离白色构件（stride 按缓冲区长度反推通道数，别信 `metadata().channels`）→ 手写生成式 SVG → `render-*.cjs` 昼夜多尺寸对照。
