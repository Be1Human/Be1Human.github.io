# CLOUD BOY · 云上男孩

[个人博客](https://be1human.github.io/portfolio/) · [作品集](https://be1human.github.io/portfolio/works.html) · [博客时间线](https://be1human.github.io/portfolio/journal.html) · [科技新闻](https://be1human.github.io/portfolio/news.html)

一个零依赖的中文个人博客：作品展示、创作记录，以及从 Dot「AI 热门 20 · 每日精选」同步的日期归档。浅色阅读布局，适配手机；全部主要内容在 HTML 中，关闭 JavaScript 也能阅读。

## 本地运行

需要 Node.js 22 或更高版本，无需安装 npm 依赖。

```sh
npm run build
npm run check
npm start
```

打开 <http://127.0.0.1:4174/portfolio/>。GitHub Pages 从 `main` 分支根目录发布；构建生成的 HTML、RSS 和 sitemap 都随代码提交。

## 更新作品

编辑 `data/projects.json`，把图片放在 `assets/images/`。项目介绍必须有对应的公开来源，记录在 `data/content-sources.json`。图片来源见 [CREDITS.md](CREDITS.md)。构建会检查图片、项目来源与链接。

## 写博客

首页是类似 X 的个人时间流，混合显示短动态和文章摘要。用户在聊天里说「发一条动态」或「发布一篇文章」即可提供发布内容；具体流程见 [docs/blog-publishing.md](docs/blog-publishing.md)。短动态存放在 `data/updates.json`，完整显示正文；长文章点击卡片进入全文页。原有 `journal.html` 地址也进入同一条时间流。

在 `data/posts.json` 添加一篇文章，填写唯一的 `id`、真实的发布日期 `date`、标题、摘要、分类、标签，以及由小节和段落组成的 `sections`。可选 `image`、`imageAlt`；参考资料写在 `links` 中。

运行 `npm run build` 后会生成 `posts/<id>.html`，并自动更新首页、时间线、RSS 和 sitemap。文章列表按日期倒序，同日保持输入顺序。首批三篇文章是本次改版的站点记录和基于现有公开项目说明整理的项目手记，没有虚构历史发布日期。

## 每日科技新闻

完整工作流程见 [docs/news-sync.md](docs/news-sync.md)。资讯导入使用字段白名单，只保留可公开的标题、摘要和出处，不搬运转发草稿或内部笔记。

持续同步每 15 分钟检查一次 Dot 已发布版本。新增一期、同一天再次更新、历史资讯更正都会自动同步；没有变化时不提交。电脑与桌面应用恢复运行后会补齐期间的更新。

```sh
npm run news:sync -- /absolute/path/to/verified-source-checkout
npm run build
npm run check
```

每期都有独立静态链接，例如 `news/2026-10-26.html`。`news.html` 显示最新一期；分类和搜索支持可分享的查询参数，`news.html?date=2026-10-26` 也会跳转到对应归档。无 JavaScript 时可使用页面下方的「全部日期归档」和上一期、下一期链接。

## 结构

- `src/page.template.html`：共享导航、页面头部和页脚。
- `scripts/build-blog.mjs`：页面渲染、内容验证、RSS、站内链接检查。
- `assets/styles.css`：桌面与手机布局。
- `assets/app.js`：筛选、搜索、日期切换和旧作品锚点兼容。
- `scripts/news-data.mjs`：公开字段白名单、来源校验和重复导入处理。
- `scripts/publish-news.mjs`：自动同步的构建、检查和受限提交发布。

请编辑源数据和模板，不直接编辑生成的 HTML。所有站内资源使用相对路径，适用于 GitHub Pages 的 `/portfolio/` 子目录。

## 隐私与来源

不使用访客账号、表单或第三方统计，不保存访客搜索内容；搜索词只反映在当前地址栏。没有远程字体。新闻预览使用原帖图片地址，打开原帖可查看完整媒体，版权归原作者。Dot 原始阅览室保持私有，博客页面不包含源站令牌。

作品说明依据固定版本的公开文档，资讯摘要沿用每日精选，不代表已经运行或独立验证所有产品。保留来源链接与必要的项目适用范围。
