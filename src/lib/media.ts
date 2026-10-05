/**
 * 图片路径归一化。
 *
 * frontmatter 里写图片有两种写法，都支持：
 *  - 站内相对路径：`images/post/xxx.webp` → 自动补上 BASE_URL（/NewBlog）
 *  - 外链直链：`https://…/a.jpg` 或根绝对路径 `/a.jpg` → 原样使用
 *
 * 之所以要放开外链：封面 / 友链图允许先用直链顶上，站内资产没到位时也能发文章。
 */
const B = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function mediaUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/')) return src;
  return `${B}/${src.replace(/^\.?\//, '')}`;
}
