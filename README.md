# 歌未竟,东方白 · dongfangbai.com

> 一个学生的数字花园。在读历史,看市场,写字。

致敬:
- Rauno Freiberg ([rauno.me](https://rauno.me)) — 克制的工程师笔记本气质
- 庵野秀明《新世纪福音战士》— NERV 战术 UI 视觉语法
- 毛主席《贺新郎·读史》— 「歌未竟,东方白」

## 技术栈

- **Astro 5** · 静态生成
- **Markdown content collection** · 文章 = `src/content/posts/*.md`
- **零后端,零数据库** · git push 即发布
- **Cloudflare Pages** · 部署目标(也支持 Vercel / Netlify)

## 开发

```bash
npm install
npm run dev      # localhost:4321
npm run build    # 输出到 dist/
npm run preview  # 本地预览构建结果
```

## 发布新文章

不需要任何后台、登录、API。**写一个 markdown 文件 → git push,30 秒后线上**。

```bash
# 1. 新建文章
cat > src/content/posts/case-008.md <<'EOF'
---
caseId: CASE-008
date: 2026.06.01
tags: [读书, 随笔]
readTime: 5 MIN
title: 我看完了《人类简史》
subtitle: 第三遍读,这次看到了别的东西。
---

正文从这里开始......

<div class="pullquote">引言:此句深得我心。</div>

普通段落继续。
EOF

# 2. 提交
git add . && git commit -m "post: case-008" && git push

# 3. Cloudflare Pages 自动构建,30 秒后线上看到
```

## 谁能发文章

- **只有有 `git push` 权限的人**(就是你)
- GitHub 账号 + SSH key 是你的鉴权
- 没有公开后端 API → 没有攻击面
- 比传统"账号 + 密码登录后台"安全 1000 倍

## 文章 frontmatter schema

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `caseId` | string | ✅ | 形如 `CASE-008` |
| `date` | string | ✅ | 形如 `2026.06.01`(YYYY.MM.DD)|
| `tags` | string[] | ✅ | 形如 `[读书, 随笔]` |
| `readTime` | string | ✅ | 形如 `5 MIN` |
| `title` | string | ✅ | 文章标题 |
| `subtitle` | string | ✅ | 副标题 / 引言 |
| `draft` | boolean | ❌ | 默认 false。true 时不发布 |

## 文章内可用的 HTML class

Markdown 文件内可以直接写 HTML 标签,以下 class 已有样式:

- `<div class="pullquote">引文</div>` — 鎏金 italic 大字引言
- `<div class="code-block">...</div>` — NERV 终端绿代码框
- `<div class="figure-block">...</div>` — 图片占位 + EXIF
- `<strong>` `<em>` — 自动着色(橙 / 紫)

## 部署到 Cloudflare Pages

1. Push 代码到 GitHub
2. Cloudflare Pages → Connect to Git → 选你的 repo
3. 构建命令:`npm run build`
4. 输出目录:`dist`
5. 完成。绑定 `dongfangbai.com` 域名(DNS A 记录指向 Cloudflare 提供的 IP)

---

歌未竟,东方白。
