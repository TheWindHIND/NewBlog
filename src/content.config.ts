import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    seriesIndex: z.number().optional(),
    draft: z.boolean().default(false),
    /** 卡片封面小图（本地路径或外链直链都可；留空则卡片不带封面） */
    cover: z.string().optional(),
    /** 本篇专属的页首插画带（覆盖主题令牌里的 --post-bg） */
    bg: z.string().optional(),
    /**
     * 插画明暗档：`auto` = 用主题默认的透明度/纱层；
     * `bright` = 亮色插画（整张发白那种）——夜主题下默认纱层会把它压到几乎看不见，
     * 所以换一套「多露图、少压纱」的令牌；`dark` = 很暗的插画——默认纱层下只剩一层黑，
     * 也要少压纱。见 tokens.css 的 --post-bright-* / --post-dark-*。
     */
    bgTone: z.enum(['auto', 'bright', 'dark']).default('auto'),
    /** 主题配对插画：芒（昼）主题时把页首插画整张换成这张（归档页那套昼夜两图的用法） */
    bgDay: z.string().optional(),
    /** 配对图的档位，缺省跟随 bgTone */
    bgDayTone: z.enum(['auto', 'bright', 'dark']).optional(),
    /**
     * 插画取景（background-position）。方形 / 竖构图塞进宽插画带时，
     * `cover` 会上下裁掉一大截、按默认取景正好把头切掉 → 这里手动往上提。
     */
    bgPos: z.string().optional(),
    /** 配对图的取景，缺省跟随 bgPos */
    bgPosDay: z.string().optional(),
    /** 卡片封面带的取景（默认 center）。封面带只有 132px 高，方图同样要往上提。 */
    coverPos: z.string().optional(),
    description: z.string().optional(),
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: z.object({
    src: z.string(),
    alt: z.string(),
    date: z.coerce.date().optional(),
    group: z.string().default('日常'),
    /** true = 先不上线（构建时跳过），和文章一个口径 */
    draft: z.boolean().default(false),
  }),
});

const now = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/now' }),
  schema: z.object({
    updated: z.coerce.date().optional(),
    playing: z.array(z.string()).default([]),
    watching: z.array(z.string()).default([]),
    listening: z.array(z.string()).default([]),
    note: z.string().optional(),
  }),
});

export const collections = { posts, gallery, now };
