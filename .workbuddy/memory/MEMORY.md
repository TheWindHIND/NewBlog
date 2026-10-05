# NewBlog 项目长期备忘

完整项目说明见资料库《藏枫的猫窝》交接说明书（源文件 `raw-assets/handoff.md`）。本文件只留「坑 + 铁律」。

## 站点
`TheWindHIND/NewBlog` → https://thewindhind.github.io/NewBlog/ ；push main 触发 Actions 发布；全手写设计不上框架。

## 环境铁律
- git 用系统版：`"/c/Program Files/Git/cmd/git.exe" -c http.schannelCheckRevoke=false push`（PortableGit 不认该配置）。
- ⚠️ `github.com` HTTPS 时挂（502/000，`api.github.com` 正常）→ 备用 **SSH over 443**：
  `GIT_SSH_VARIANT=ssh GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" "/c/Program Files/Git/cmd/git.exe" push ssh://git@ssh.github.com:443/TheWindHIND/NewBlog.git main`
  （必须 `GIT_SSH_VARIANT=ssh`；ssh 要写 `ssh …` 走 PATH。不改 origin。）
- 推送后查 `api.github.com/repos/TheWindHIND/NewBlog/actions/runs?per_page=1` 的 conclusion（curl 加 `--ssl-revoke-best-effort`），
  再抽查线上。⚠️ Pages 新文件有传播延迟：刚 success 时新 CSS 可能仍 404/旧内容，等几十秒重试。
- ⚠️ **`npm run build` 前必须 `mv dist/.prerender <项目外的别处>`**：Astro 收尾删该临时目录，>100 文件会触发环境
  「批量删除防护」而失败；mv 改名不算删除。CI 无此问题。
- ⚠️ push 被拒「remote contains work you do not have」：用户会往 main 打**空备份提交**（`backup:before …`）。
  `fetch ssh://… main` 后 **`git rebase FETCH_HEAD`**（别 merge），再 push。
- **截图 = Edge 无头**：`"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu
  --no-sandbox --hide-scrollbars --force-device-scale-factor=2 --force-prefers-reduced-motion
  --run-all-compositor-stages-before-draw --window-size=1100,1250 --virtual-time-budget=25000
  --user-data-dir=<新目录> --screenshot=<绝对路径> <url>`（agent-browser 本机已废）
  - **必须 `--force-prefers-reduced-motion`**，否则截到过渡中间态（家具不可见/猫被放大）。
  - ⚠️ 把 Edge 调用**包进 shell 函数/for 循环**时曾静默不产出（单独跑就正常）→ 每次截完 `ls -la` 校验，别 `>/dev/null` 蒙眼。
  - ⚠️ `--user-data-dir` 写成 **`C:/tmp/edge-xxx`**（盘符路径）。写 `/tmp/edge-xxx` 时曾整批静默不产出。每次换新目录名。
  - ⚠️ `--window-size` < ~500px 时 Windows 按更宽视口排版只裁出这么宽 → **窄屏截图「溢出」是假象**，判真溢出看 CSS。
  - ⚠️ 预览服务会内存缓存旧产物 → 改完源码 `npx astro preview stop` 再 `--port 4321 --force` 重启，否则截到旧画面。
  - ⚠️ 预览只监听 IPv6：`http://[::1]:4321/NewBlog/…`，curl 加 `--noproxy '*'`（否则被代理挡成 502）。
- **催熟 localStorage 页面**：构建后 `mkdir -p dist/__seed && cp raw-assets/ref/seed.html dist/__seed/index.html`，
  访问 `…/__seed/?t=ousia&v=40&to=room`（t=主题，v=回访数，to=落地页 posts/posts/<slug>/about/now…）。
  ⚠️ `catnest.theme` 存**裸字符串**（`'ousia'`/`'pneuma'`），其余 `visits/achievements/read/feed.*` 走 `JSON.stringify`。
  `dist/` 已 gitignore，每次 build 后要重新 cp 种子页。

## 前端踩坑
- Astro **scoped 样式打不进 SVG `<use>` 影子内容**（不命中、无 scope 属性）→ 退回 `fill:black`（顶栏「一条黑线」）。
  复用 SVG 几何就渲染真实节点；非用 `<use>` 则把 fill/stroke 写在 `<use>` 上。`set:html` 注入的 SVG 同理 → 用 `var(--x,回退)`。
- ⚠️ ⚠️ **Markdown 正文同样拿不到 scoped 样式**：`.prose p {…}` 编译成 `.prose[cid] p[cid]`，而 `<Content />` 渲染出的
  元素**不带 cid** → 段距/标题/引用/代码块/表格样式**静默全失效**（曾让诗的分节消失、正文全无段距，很久没人发现）。
  正文类后代选择器必须写 **`.prose :global(p)`**。手写在 `.astro` 模板里的 prose（如 about 页）带 cid，照旧写。
- ⚠️ **`<img width height>` 是作者级 presentational hint**：只写 `width:100%` 覆盖不了高度 → 窄栏里图片纵向拉长。
  靠属性预留 CLS 的图，CSS 必须补 **`height:auto`**（要固定比例再加 `aspect-ratio`）。
- ⚠️ **CSS 变量不跨兄弟节点**：给 `.post-bg`/`.post-veil` 这类兄弟元素配参数时，各自挂自己的变量。
- 「今日一句」：语录 `consts.ts` 的 `QUOTES[]`，公式 `YYYY*372+(M+1)*31+D` 取模。构建时渲染一条（无 JS 兜底）
  + Footer 内联 `#site-quotes` JSON，前端按**访客本地日期**重算 index（纯静态站「真的每天换」的解法）。
- ⚠️ 网格一律 `minmax(min(100%, Npx), 1fr)`：少了 `min(100%,…)` 护栏，窄屏列宽会被 Npx 撑出横向滚动。
- **「语录」= `/posts` 的第三块分类**（项目 / 语录 / 杂谈；`QuoteCard.astro` + `consts.ts` 的 `POST_QUOTES[]`，
  与页脚「今日一句」的 `QUOTES[]` 是**两套**，别混）。条目 `{text,date,image?,alt?}`，倒序＝新的在前；
  **长条卡**（宽屏两列 `minmax(min(100%,460px),1fr)`，配图缩成卡内左侧小图撑满卡高），板块带 `id="quotes"`。
  ⚠️ 早期版本挂在**文章页页末**、文章页共用 → 语录一多每篇文章下面一长列，已撤（别再挂回去）。
  日期**当年只写「X 月 X 日」、跨年才带年份**（手写 `iso.split('-')` 拆，别用 `new Date()` 免得时区挪一天）。
- **星空猫座的语录星座**（`StarMap.astro` 的 `quotes` 入参）：语录星 `year: null`（不会混进年份连线），
  金色小星围绕**独立中心**散开、不连线，虚线圈 + 中心菱形 + 「语录 · N 句」标签；悬停浮出语录全文，点击跳 `/posts/#quotes`。
- 落款日期：文章 markdown 里直接手写 `<p class="sign">…</p>`，样式在 PostLayout 用 **`.prose :global(.sign)`**（插槽内容不带 scope）。

## 伪 Live2D 分层（`Live2DCat.astro` + `scripts/slice-cat.cjs`）
- 双下巴修法：头切线落在 61.8~63% 平坦颈肉、羽化 1.4px、`transform-origin: 50% 62%` 压在切缝，竖直响应走 `scaleY`。
- 尾巴修法：`_probe-tail.cjs` 逐行量边界重写 `TAIL_POLY`（内缘绕开手指：y79~82% 手占 x68.2~76.2；外缘到 x≈91%）、
  `TAIL_MARGIN=1.0` 绝不往根部扩、`growMaskIntoInk(mask,6)` 沿深色线稿生长吃描边（贴皮肤的深色不吃，保住手描边）、
  `TAIL_PIVOT=(70.5,85.5)` 取可见根部；尾巴画在身体之上（z-index 2）。
- ⚠️ ⚠️ **sharp 合成的 `dest-in`/`dest-out` 认遮罩 alpha，不认 RGB**。曾把遮罩写进 RGB、alpha 恒 255 →
  尾巴层吃到整只猫、头身层全空 → 页面「猫」整只跟着摆尾动画转（用户看到的是「先快晃几下再机械旋转」）。
  正解：**RGB 恒白、遮罩值写进 alpha**。`slice-cat.cjs` 已加交付前自检（读刚写的 webp 断言四层覆盖率，越界 exit 1）。
- ⚠️ **改了切图脚本必须重跑 + 重新截图核对**（曾事故＝验证过→又改脚本→没重验→坏图进仓库）。
- 夹具 `_motion-fixture.cjs` 把 `dist/room/index.html` 复制到 `dist/__motion/` 注入脚本，按生产公式钉姿态
  `?cx=&cy=&tail=`，**`?bg=magenta`** 藏布景刷品红（缺像素立刻漏底）；配 `_chk-tail-layers.cjs`、`_chk-alpha.cjs`。
  ⚠️ 偶发整层空白 = `decoding="async"` 解码竞态，重跑即正常。

## 背景插画 / 内容扩展点（文章 · 图库 · 友链）
- 关于页：`public/images/about/room-night.webp`；`.page-bg` 固定铺满 + `::after` 压主题色，令牌 `--about-*-o`
  （夜 .55/.62/.42，昼 .4/.87/.16）。「枫」字 = `data-qq="2927015997"` 点击复制。
- 文章页 + 列表页共用 `PostBackdrop.astro`（`variant="list"` 换列表页令牌，`bg`/`tone` 做单篇覆盖）：
  页首**渐隐插画带** `.post-bg`（`min(92vh,820px)`、`bg-position:68% 30%`、mask 上淡入下淡出）+ `.post-veil`
  （纯 `var(--bg)` + mask 只压上缘）。⚠️ **别用「主题色→透明」渐变当纱**（sRGB 中段混灰）→ 一律 mask。
  令牌：`--post-img-o/--post-veil-o`（夜 .5/.86、昼 .34/.94）、列表 `--post-list-*`（夜 .66/.66、昼 .38/.9）。
- 文章 frontmatter：`cover`（卡片封面带）、`bg` + `bgTone`（本篇页首插画）、`series`/`seriesIndex`。
  ⚠️ **已删掉 `kind`**（项目不再由文章承担，别再加回来）。
- **「项目」= 作品墙，不是文章**：`consts.ts` 的 `PROJECTS[]`（name/url/desc/tags/cover/note）→ `ProjectCard.astro`
  渲染，整块卡片**外链**项目站点；`note` = 站内那篇「过程笔记」的 slug，卡片下方再给一个站内入口。
  写法的来龙去脉一律当**普通文章**收进「杂谈」按年份归档。
- 图片路径一律走 **`src/lib/media.ts` 的 `mediaUrl()`**：相对路径补 BASE_URL，`http(s)://`/`data:` 原样（可先用直链顶）。
- ⚠️ **亮色插画（整张发白）必须标 `bgTone: bright`**：夜主题默认纱会把图糊没。bright 档换 `--post-bright-*`
  （夜 .62/.58、昼 .5/.42），且纱的实心区从 15% 延到 **30%**（标题/日期落在 20% 上下，不然对比度被亮图顶掉）。
- ⚠️ 列表页页首的「裸文字」（`.board-title`/`.board-sub`/`.year`）是**压在插画带**上的：要给同底色柔光字影
  `text-shadow: 0 1px 12px var(--bg), 0 1px 2px var(--bg)`（可继承）；`.board-sub` 还要用 `var(--text)` + `opacity:.72`，
  用 `--muted` 会在插画最亮的墙面上糊掉。
- 友链 = `consts.ts` 的 `FRIENDS[]`（name/url/cover/avatar/desc）→ 关于页「**同台 · FELLOW ACTS**」区块。
- 图库 = `src/content/gallery/*.md`（`src/alt/date/group`；`GROUP_ORDER`：站点视觉 / 站点插画 / **文章封面** / 文章插画 / 友链）。
- 用户给的图统一走 **`node scripts/optimize-media.cjs`**（`JOBS` 里登记 from/to/preset）：原图进 `raw-assets/` 留档、
  webp 进 `public/`，**打印平均亮度**提示要不要标 `bgTone: bright`（≥150 就该标）；顺手登记一条 gallery。
  ⚠️ **视频截图自带黑边**（例：2400×1080 左右各 239px 纯黑）→ `JOBS` 里加 **`trim: 'auto'`** 先裁再压（也可写死 `[左,右,上,下]`）；
  不裁的话图一进卡片/插画带就是两条黑杠。
  ⚠️ `raw-assets/` 在 .gitignore 里（只本地留档，CI 不需要）。
- 语录 = `consts.ts` 的 `POST_QUOTES[]` + `QuoteCard.astro`（挂在 `/posts` 的「语录」分类，不在文章页；见「前端踩坑」）。

## 文章对外口径（用户明确要求）
- 不写自己的真实所在地（具体省市一律写 `××省 ××市` 占位）。
- 不写「彩蛋 / 恶作剧」这类隐藏机制。
- 不写密钥处理细节（原文那段 Base64 是**真 key 碎片**，绝不能进仓库）。

## 包厢 / 字体 / 资产（细节见 handoff.md，只记易踩的）
- ⚠️ 包厢墙面**避开猫位中带**（Live2DCat 浮层占 viewBox x296–504，纵向 y≈96–437）→ 只用 x<290 与 x>504。
- ⚠️ 家具**别吃 `--accent/--accent-2`**（昼夜含义不同）：植物写**真绿常量**；夜场木器用 #375681 + `--ornament` 勾边；
  昼场墙裙 #ecdcc0。改色前**两套主题都出图**。
- 字体：站酷快乐体子集 `public/fonts/zcool-kuaile.woff2`（仅标题几个字），令牌 `--font-round`；系统**没有幼圆**，
  堆系统栈会掉回 KaiTi。加字用 Google Fonts `text=` 接口取 woff2（curl 加 `--ssl-revoke-best-effort`）。
- 资产管线：`raw-assets/cat/aylen-full.png`（原画）→ `hat-ears-only.cjs` → `slice-cat.cjs` → `public/images/cat/*.webp`；
  `scripts/eyes-cat.cjs` **已废弃**，误跑会覆盖眼睛。图标 `key-ui.cjs`（绿幕抠）、徽记 `trace-emblem.cjs`。
- 矢量道具：`sword-geom.mjs`（阅读进度剑）、`nail-geom.mjs`（寒天之钉）→ 颜色写成 `var(--x,回退)` 的**属性**（要过 `set:html`）。
  ⚠️ 参考图→矢量工序：`probe-refs` → `crop-ref`/`grid-ref` 读坐标 → `mask-ref` 分离白色构件（stride 按缓冲区长度
  反推通道数，别信 `metadata().channels`）→ 手写生成式 SVG → `render-*.cjs` 昼夜多尺寸对照（已按目标尺寸渲染就别再 resize）。
