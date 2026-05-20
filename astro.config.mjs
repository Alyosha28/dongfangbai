import { defineConfig } from 'astro/config';

// Cloudflare adapter 已移除 —— 产物为纯静态 HTML/CSS/JS，可直接部署到任意 nginx/Apache/CDN
// 如需恢复 Cloudflare 部署，取消下面 import 和 adapter 行的注释
// import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://finalwhite.lol',
  output: 'static',

  build: {
    inlineStylesheets: 'auto',
    assets: 'assets',
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

  // adapter: cloudflare()
});