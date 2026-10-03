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
    cover: z.string().optional(),
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
