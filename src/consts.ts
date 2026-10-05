/** 站点全局常量 */

export const SITE = {
  title: '藏枫的猫窝',
  subtitle: '枫丹水色 · 一只猫的栖所',
  description: '藏枫的猫窝 —— 枫的个人博客，芙宁娜印象风 × 猫猫。文章、图库与深夜星空下的归档。',
  author: '枫',
  lang: 'zh-CN',
};

/**
 * 友链（关于页「同台」区块）
 *  - cover：卡片封面图；avatar：圆框头像；都支持站内相对路径或外链直链
 *  - desc 可留空（卡片只显示标题与域名）
 */
export const FRIENDS = [
  {
    name: "Hi, I'm 柳卿烟",
    url: 'https://liu-qinyan.github.io/LQY/',
    cover: 'images/links/lqy-site.webp',
    avatar: 'images/links/lqy-avatar.webp',
    desc: '晚风、猫，和写不完的句子。',
  },
];

/**
 * 项目作品墙（文章页「项目」分组）
 *  - 卡片整块点击 = 打开项目本身的站点（新窗口）
 *  - tags / cover 都可留空；cover 支持站内相对路径或外链直链
 *  - note：站内那篇「过程笔记」的 slug（写了就在卡片下方多一个站内入口）
 */
export const PROJECTS = [
  {
    name: '我马上来',
    url: 'https://thewindhind.github.io/im-coming/',
    desc: '一个单文件纯静态页面：打开链接的第一秒，它就说出了你在哪个省、哪个市。',
    tags: ['原生 JS', '单文件', '定位'],
    note: 'im-coming',
  },
];

/**
 * 语录（文章页底部的「语录」区块，倒序排列 = 新的在前）
 *  - text：语录原文（原样照录，标点不动）
 *  - date：ISO 日期，仅用于显示；当年只显示「X 月 X 日」，跨年才带年份
 *  - image / alt：可选配图（站内相对路径或外链直链）与替代文字
 */
export const POST_QUOTES = [
  {
    text: '涌现——当单个神经元的电讯号，在千万个同类中找到共鸣，意识的涟漪便悄然扩散。',
    date: '2026-09-25',
    image: 'images/quotes/emergence.webp',
    alt: '少女穿行于浮窗与光轨之间',
  },
  {
    text: '何为探索？就是在纷乱的碎片中重构秩序，于冰冷的算法中探寻生命的深意。',
    date: '2026-08-04',
  },
  {
    text: '纵使身在远方，亦与世界同频',
    date: '2025-11-12',
  },
];

/**
 * 芙宁娜语录（页脚「今日一句」，每日轮换）
 *  - 取句公式：`年*372 + (月+1)*31 + 日` 再对池长取模（详见 handoff 6.2）
 *  - **池长 = 轮换周期**：现 20 句 ≈ 20 天一轮，然后从头再来（取模天然循环，不存在用尽）
 *  - 语气统一朝「戏剧化 + 自恋 + 一点点藏起来的孤独」走；纯猫叫、温柔迎客那种口吻不属于她
 */
export const QUOTES: string[] = [
  '「这样的荣耀，非我莫属！」',
  '「水的意志，将裁断一切。」',
  '「审判的时刻到了——诸位，请看好戏开场！」',
  '「枫丹的每一滴水，都记得我的名字。」',
  '「哼哼，区区风浪，可吓不倒大明星芙宁娜！」',
  '「帷幕拉开之后，就请一直注视着我吧。」',
  '「泡泡里装着的，是我全部的诚意哦。」',
  '「就算一个人，戏也要演完——这才叫主角。」',
  '「台上没有彩排，每一幕都是本大明星的即兴——好好看着。」',
  '「唔…刚才那一段纯属意外！重来，让我重新登场。」',
  '「哼，本大明星可不是白等你一天的……不过既然来了，就坐前排吧。」',
  '「掌声呢？掌声在哪里——哦，只有你一个？……那也够了。」',
  '「水知道所有的答案，它只是不肯开口。所以这出戏，由我来演。」',
  '「枫丹的雨会停，可我的演出不会。」',
  '「别用那种眼神看我——我演得很努力呢，夸我一句也不会掉价吧？」',
  '「点心、掌声，还有一点点香水味。这才叫偶像的自我修养。」',
  '「今天的水，也是照着我剧本的方向流的哦。」',
  '「审判要公平，掌声要响，甜点要甜——三样都不能少。」',
  '「谢幕之后灯会暗下来，但明天仍会有人为我鼓掌——一定是这样。」',
  '「本大明星的剧本里没有『累』这一页，你可别替我写。」',
];

/** 芙芙的小包厢养成阶段（visits 门槛 → 阶段描述） */
export const CAT_NEST_STAGES = [
  { min: 1, name: '初来乍到', desc: '芙芙警惕地看着你，尾巴不安地扫着地板' },
  { min: 3, name: '纸箱安家', desc: '芙芙认了这张脸，搬进了纸箱' },
  { min: 5, name: '软垫地毯', desc: '地毯铺开、软垫就位，芙芙开始翻肚皮' },
  { min: 10, name: '抱枕毛线', desc: '抱枕、毛线球和马卡龙堆成了小山' },
  { min: 20, name: '灯串壁架', desc: '灯串亮起，壁架上摆起水族馆和枫丹小收藏' },
  { min: 40, name: '满级小包厢', desc: '壁炉生辉、书柜满架，芙芙在天鹅绒猫窝里睡翻' },
];

/** 成就徽章定义（icon 用于 toast 表情，glyph 用于页面内的芙宁娜风 SVG 图标） */
export const ACHIEVEMENTS = [
  { id: 'first-visit', name: '初来乍到', desc: '第一次推开小包厢的门', icon: '🐾', glyph: 'cat' as const },
  { id: 'regular', name: '常客', desc: '回访 5 次，芙芙记住了你', icon: '🐱', glyph: 'star' as const },
  { id: 'nest-full', name: '满级小包厢', desc: '回访 40 次，小包厢盛况空前', icon: '🏆', glyph: 'shell' as const },
  { id: 'first-feed', name: '第一罐猫粮', desc: '第一次投喂成功', icon: '🥫', glyph: 'drop' as const },
  { id: 'reader-1', name: '读书猫', desc: '读完第一篇文章', icon: '📖', glyph: 'quill' as const },
  { id: 'reader-10', name: '博学猫', desc: '读完 10 篇文章', icon: '🎓', glyph: 'mask' as const },
  { id: 'stargazer', name: '观星者', desc: '到访过星空猫座', icon: '✨', glyph: 'star' as const },
  { id: 'lost-cat', name: '迷路的猫', desc: '遇见了 404 页的猫', icon: '🌀', glyph: 'wave' as const },
];
