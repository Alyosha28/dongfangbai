import { defineConfig } from 'astro/config';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://dongfangbai.com',
  output: 'static',

  build: {
    inlineStylesheets: 'auto',
  },

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  vite: {
    build: {
      cssMinify: true,
    },
  },

  adapter: cloudflare()
});