/** 猫窝互动系统：统一的 localStorage 存储层（全部纯前端，命名空间 catnest.*） */

const K = {
  theme: 'catnest.theme',
  visits: 'catnest.visits',
  sess: 'catnest.sess',
  achievements: 'catnest.achievements',
  read: 'catnest.read',
  feedPrefix: 'catnest.feed.',
};

function jget<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : (JSON.parse(v) as T);
  } catch {
    return def;
  }
}
function jset(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 忽略隐私模式 */
  }
}

/** 解锁成就；返回是否为新解锁（用于触发 toast）。触发 window 事件 catnest:achievement */
function unlock(id: string): boolean {
  const list = jget<string[]>(K.achievements, []);
  if (list.includes(id)) return false;
  list.push(id);
  jset(K.achievements, list);
  window.dispatchEvent(new CustomEvent('catnest:achievement', { detail: { id } }));
  return true;
}

export const catnest = {
  /** 回访计数（每会话只 +1），顺带触发回访类成就 */
  countVisit(): number {
    let visits = jget<number>(K.visits, 0);
    const counted = sessionStorage.getItem(K.sess);
    if (!counted) {
      visits += 1;
      jset(K.visits, visits);
      sessionStorage.setItem(K.sess, '1');
      if (visits === 1) unlock('first-visit');
      if (visits === 5) unlock('regular');
      if (visits === 40) unlock('nest-full');
    }
    return visits;
  },

  visits(): number {
    return jget<number>(K.visits, 0);
  },

  getFeed(slug: string): number {
    return jget<number>(K.feedPrefix + slug, 0);
  },

  addFeed(slug: string): number {
    const n = this.getFeed(slug) + 1;
    jset(K.feedPrefix + slug, n);
    unlock('first-feed');
    return n;
  },

  /** 记录读完整篇文章；返回是否第一次标记该篇 */
  markRead(slug: string): boolean {
    const list = jget<string[]>(K.read, []);
    if (list.includes(slug)) return false;
    list.push(slug);
    jset(K.read, list);
    if (list.length >= 1) unlock('reader-1');
    if (list.length >= 10) unlock('reader-10');
    return true;
  },

  readCount(): number {
    return jget<string[]>(K.read, []).length;
  },

  unlock,

  achievements(): string[] {
    return jget<string[]>(K.achievements, []);
  },
};
