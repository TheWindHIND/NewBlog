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
