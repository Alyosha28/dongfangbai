# Alba (黍秋) — Personal Site (`finalwhite.lol`)

个人主页与数字花园，基于 **Astro 5** 静态生成，托管在 Cloudflare Workers (`finalwhite.lol`)。包含个人简介、项目、工作论文与随想文章，以及一只可点击/暂停的像素风小老鼠桌宠。

## 极简内容管理（不需要改页面代码）

| 想改什么 | 修改哪个文件 | 说明 |
| --- | --- | --- |
| 个人简介、经历、技能、社交链接 | [src/data/profile.yaml](file:///Users/albaincompleta/dongfangbai/src/data/profile.yaml) | 全站名片、域名、页脚、About 页的唯一数据源 |
| 论文列表（Abstract / BibTeX / 链接） | [src/data/papers.yaml](file:///Users/albaincompleta/dongfangbai/src/data/papers.yaml) | `featured: true` 会同时展示在首页 |
| 项目列表 | [src/data/projects.yaml](file:///Users/albaincompleta/dongfangbai/src/data/projects.yaml) | `featured: true` 会同时展示在首页 |
| 随想文章（Markdown） | `src/content/thoughts/*.md` | 只需填 `title` 和 `date`；阅读时长自动计算，支持可选 `marginalia` 旁注 |

### 本地写新文章

```bash
npm run new "文章标题"
```

会在 `src/content/thoughts/` 下生成带今日日期的 Markdown 模板（默认 `draft: true`，写完改为 `false` 即可发布），随后提交推送：

```bash
git add . && git commit -m "thought: ..." && git push
```

GitHub Actions 会自动构建并部署到 `https://finalwhite.lol`。

### 网页端后台（Pages CMS）

仓库根目录已配置 [.pages.yml](file:///Users/albaincompleta/dongfangbai/.pages.yml)。访问 [pagescms.org](https://pagescms.org) 使用 GitHub 账号登录并关联本仓库，即可直接在浏览器里增改 **Thoughts / Papers / Projects / Profile** 并上传图片到 `public/uploads/`，保存即自动提交触发发布。

## 替换像素风桌宠精灵表

当前像素小老鼠精灵表位于 [public/pet/mouse-spritesheet.png](file:///Users/albaincompleta/dongfangbai/public/pet/mouse-spritesheet.png)（与无损 `.webp`），尺寸固定为 **192×144 px**（4 列 × 3 行，每格 48×48 px）：

- 第 0 行：Idle（呼吸 / 眨眼）
- 第 1 行：Wave（打招呼 / 交互）
- 第 2 行：Sleep（待机休息）

如果你后续用 Omni 或其他像素动画工具生成了新的 3 段横向 4 帧绿幕素材，直接运行打包脚本即可一键生成并替换：

```bash
python3 scripts/build-pet-sprites.py \
  --idle path/to/idle.png \
  --wave path/to/wave.png \
  --sleep path/to/sleep.png \
  --out-png public/pet/mouse-spritesheet.png \
  --out-webp public/pet/mouse-spritesheet.webp
```

## 常用开发与检查命令

```bash
npm run dev      # 本地开发预览
npm run check    # Astro + TypeScript 类型检查
npm run build    # 静态构建到 dist/
npm test         # 运行内容脱敏、链接与 Worker 契约测试
```
