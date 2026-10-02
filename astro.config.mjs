// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://thewindhind.github.io',
  base: '/NewBlog',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: {
    shiki: {
      themes: {
        light: 'github-light',
        dark: 'github-dark-default',
      },
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
