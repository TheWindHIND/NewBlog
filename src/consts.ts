/** 站点全局常量 */

export const SITE = {
  title: '藏枫的猫窝',
  subtitle: '枫丹水色 · 一只猫的栖所',
  description: '藏枫的猫窝 —— 枫的个人博客，芙宁娜印象风 × 猫猫。文章、图库与深夜星空下的归档。',
  author: '枫',
  lang: 'zh-CN',
};

/** 芙宁娜语录（每日轮换） */
export const QUOTES: string[] = [
  '「这样的荣耀，非我莫属！」',
  '「水的意志，将裁断一切。」',
  '「审判的时刻到了——诸位，请看好戏开场！」',
  '「枫丹的每一滴水，都记得我的名字。」',
  '「哼哼，区区风浪，可吓不倒大明星芙宁娜！」',
  '「帷幕拉开之后，就请一直注视着我吧。」',
  '「泡泡里装着的，是我全部的诚意哦。」',
  '「就算一个人，戏也要演完——这才叫主角。」',
  '「喵？……不、刚才什么都没发生！」',
  '「欢迎回窝，今天也想听你说说话。」',
];

/** 猫窝养成阶段（visits 门槛 → 阶段描述） */
export const CAT_NEST_STAGES = [
  { min: 1, name: '初来乍到', desc: '一只蜷缩的小猫警惕地看着你' },
  { min: 3, name: '纸箱安家', desc: '小猫认了这张脸，搬进了纸箱' },
  { min: 5, name: '软垫伺候', desc: '窝里多了软垫，猫开始翻肚皮' },
  { min: 10, name: '抱枕毛线', desc: '抱枕和毛线球堆成了小山' },
  { min: 20, name: '挂灯挂牌', desc: '灯串亮起，名牌写着「枫的猫」' },
  { min: 40, name: '满级猫窝', desc: '猫窝盛况空前，猫已睡翻' },
];

/** 成就徽章定义 */
export const ACHIEVEMENTS = [
  { id: 'first-visit', name: '初来乍到', desc: '第一次推开猫窝的门', icon: '🐾' },
  { id: 'regular', name: '常客', desc: '回访 5 次，猫记住了你', icon: '🐱' },
  { id: 'nest-full', name: '猫窝满员', desc: '回访 40 次，满级猫窝', icon: '🏆' },
  { id: 'first-feed', name: '第一罐猫粮', desc: '第一次投喂成功', icon: '🥫' },
  { id: 'reader-1', name: '读书猫', desc: '读完第一篇文章', icon: '📖' },
  { id: 'reader-10', name: '博学猫', desc: '读完 10 篇文章', icon: '🎓' },
  { id: 'stargazer', name: '观星者', desc: '到访过星空猫座', icon: '✨' },
  { id: 'lost-cat', name: '迷路的猫', desc: '遇见了 404 页的猫', icon: '🌀' },
];
