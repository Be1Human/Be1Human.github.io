# 克劳德梦见电子羊 · 云上男孩

[个人博客](https://be1human.github.io/) · [作品集](https://be1human.github.io/works.html) · [博客时间线](https://be1human.github.io/journal.html) · [科技新闻](https://be1human.github.io/news.html) · [Agent 学习](https://be1human.github.io/learn.html)

一个零依赖的中文作品集：新版首页使用复古像素场景、滚动镜头、章节卡片与扑克牌作品展示。动态、文章、项目详情和新闻日期归档保留原来的静态阅读页面；关闭 JavaScript 时可通过首页链接访问这些内容。

## 本地运行

需要 Node.js 22 或更高版本，无需安装 npm 依赖。

```sh
npm run build
npm run check
npm start
```

打开 <http://127.0.0.1:4174/>。GitHub Pages 从 `main` 分支根目录发布；构建生成的 HTML、RSS 和 sitemap 都随代码提交。

## 更新作品

编辑 `data/projects.json`，把图片放在 `assets/images/`。当前展示 20 个项目：7 个原有公开项目，以及 13 个经作者授权整理的项目介绍。公开项目保留固定提交的来源链接；源码私有的项目使用 `presentation: "showcase"`，生成 `projects/<id>.html` 站内详情页，只包含整理后的公开介绍。项目资料依据记录在 `data/content-sources.json`，私有工程的原文与核对记录留在本地忽略目录，不进入公开数据。图片来源见 [CREDITS.md](CREDITS.md)。

用户只授权在博客展示项目，所有源仓库维持原有权限。不要将“展示作品”解释为公开源码、内部文档或部署配置，也不要给访客提供无法访问的私有仓库链接。原型、设计稿与历史实验需注明实际阶段；概念封面必须标明示意图，不冒充运行截图。

## 写博客

`journal.html` 保留个人时间流，混合显示短动态和文章摘要；新版首页的「手记」提供完整归档入口。用户在聊天里说「发一条动态」或「发布一篇文章」即可提供发布内容；具体流程见 [docs/blog-publishing.md](docs/blog-publishing.md)。短动态存放在 `data/updates.json`，完整显示正文；长文章点击卡片进入全文页。旧首页的 `#status-…` 和 `#article-…` 链接自动进入该时间流。

在 `data/posts.json` 添加一篇文章，填写唯一的 `id`、真实的发布日期 `date`、标题、摘要、分类、标签，以及由小节和段落组成的 `sections`。可选 `image`、`imageAlt`；参考资料写在 `links` 中。

运行 `npm run build` 后会生成 `posts/<id>.html`，并自动更新时间线、RSS 和 sitemap。文章列表按日期倒序，同日保持输入顺序。首批三篇文章是本次改版的站点记录和基于现有公开项目说明整理的项目手记，没有虚构历史发布日期。

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

- `src/experience/index.html`：新版首页源文件，构建时注入同源 Agent 学习 Wiki 后生成根首页，新闻同步不会覆盖设计。
- `app.js` / `style.css`：新版交互和样式；`content-local.json` 保存经审核的作品与手记内容，更新这两类内容时同步维护。
- `video-manifest.json` / `assets/video/`：按需加载的正反向镜头视频。
- 首页新闻从 `data/news.json` 自动构建完整日期索引与分期 JSON，按需读取；新闻页每五分钟检查新版本。缺图显示明确标注的主题示意。
- `src/page.template.html`：静态归档的共享导航、页面头部和页脚。
- `scripts/build-blog.mjs`：页面渲染、内容验证、RSS、站内链接检查。
- `scripts/project-data.mjs`：作品字段校验、公开源码与站内项目介绍的边界。
- `assets/site.css`：桌面与手机布局。
- `assets/app.js`：筛选、搜索、日期切换和旧作品锚点兼容。
- `scripts/news-data.mjs`：公开字段白名单、来源校验和重复导入处理。
- `scripts/publish-news.mjs`：自动同步的构建、检查和受限提交发布。

请编辑源数据和模板，不直接编辑生成的 HTML。所有站内资源使用相对路径，部署在 GitHub Pages 个人根站 `https://be1human.github.io/`。

## 隐私与来源

不使用访客账号、表单或第三方统计，不保存访客搜索内容；搜索词只反映在当前地址栏。没有远程字体。新闻预览使用原帖图片地址，打开原帖可查看完整媒体，版权归原作者。Dot 原始阅览室保持私有，博客页面不包含源站令牌。

作品说明依据固定版本的公开文档，资讯摘要沿用每日精选，不代表已经运行或独立验证所有产品。保留来源链接与必要的项目适用范围。

## 根站与旧链接

维护目录为 `/Users/guotengtao/Documents/cloudboy/blog`，远程仓库为 `Be1Human/Be1Human.github.io`。`/portfolio/` 已作为兼容入口：页面跳转到对应根地址，保留筛选参数与段落锚点；旧 RSS 仍随构建更新。旧 `Be1Human/portfolio` 仓库保留历史，但不再启用 GitHub Pages 或接收新闻同步。

## 自动发布与公网验收

完成网站修改后执行 `npm run site:publish`，自动完成构建、检查、提交、推送以及公网精确版本和视频资源验收。`npm run site:verify` 可单独用于查询或失败续验。用户请求修改即包括发布，无须再次要求上线。

## Agent 学习 Wiki

学习目录统一在主页 `#learning`，独立文章为 `learn/<id>.html`。`learn.html` 和旧 `/portfolio/learn.html` 自动回到这一个目录。内容源在 `data/learning/`，由 `scripts/learning.mjs` 验证并渲染；目录保留左侧 Wiki 分组与搜索，中间保留开场背景。文章阅读页由 `assets/learn.css` 和 `assets/learn.js` 提供侧栏、页内目录、全文搜索与阅读进度。代码复制由共享阅读组件处理。搜索在浏览器本地执行，无第三方查询服务。

现有 15 篇解读按核心机制、上下文与协作、评测与进阶组织，保留引用、资料版本、更新时间与教学示例边界。Wiki 是持续维护的知识库，发布手记同时在博客时间线和互动首页建立入口，避免用重复全文淹没手记。构建同时生成静态页面、搜索索引、sitemap 和旧路径兼容页；`site:verify` 核验所有 Wiki 页面的精确公网版本。

所有阅读页共用当前「克劳德梦见电子羊」深色品牌与导航；旧米白归档主题及云朵标识已退役，不保留双主题入口。

主页与 Agent 学习为独立栏目。主页第二段推进视频结束后自动切换到 `#learning`，在顶栏点击“首页”可返回开场；Wiki 不在主页下方占据滚动区域，不设置章节卡片或“进入学习”过渡入口。顶部导航直接切换内容，只有开场滚动和主动打开的创作漫游使用视频转场；深链接直接定位内容，不重播开场。

`src/experience/index.html` 和所有阅读页的导航均由 `scripts/site-navigation.mjs` 生成，顺序及目标一致：主页、手记、作品、Agent 学习、新闻、关于。阅读页导航返回主页的对应栏目；文章面包屑和 Wiki 标题统一返回 `index.html#learning`。旧归档和文章链接继续可用。

学习首页只移除中间的介绍、流程图、推荐卡片和学习路线，保留 Wiki 导航；博客记录可通过 `learningId` 直接将时间线和 RSS 导向对应完整 Wiki 文章。文章源位于 `data/learning/comparisons.json`。

## 图文与代码

学习正文与手记均支持 `sections[].body` 富文本；`paragraphs` 仍用于摘要和兼容读取。`scripts/rich-content.mjs` 在构建时使用随仓库分发的 Prism 1.30.0（MIT）生成静态高亮，无浏览器 CDN 依赖。论文原图和原创图解保存在 `assets/learning/`，各来源清单说明作者、出处和使用方式。图解可点开、切换原尺寸，手机可以横向查看大图。

写作与核验约定见 [编辑约定](docs/editorial.md)。手记保留首次发布日期，修改另记更新日期；不补写没有记录的个人感受或实测经历。

数学文章使用原生 MathML 排版；`assets/attention.js` 只在 Softmax/Attention 学习页加载，提供固定 logits 下 N 与分数差的交互计算。四张原创图可用 Matplotlib 执行 `python scripts/generate-attention-figures.py` 重建（Windows 微软雅黑字体），论文原图与出处见 `assets/learning/sources-attention.json`。
