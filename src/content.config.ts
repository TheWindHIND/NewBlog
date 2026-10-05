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
     * 所以换一套「多露图、少压纱」的令牌。见 tokens.css 的 --post-bright-*。
     */
    bgTone: z.enum(['auto', 'bright']).default('auto'),
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
