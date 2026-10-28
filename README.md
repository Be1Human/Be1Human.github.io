# CLOUD BOY · 个人作品集

[访问主页](https://be1human.github.io/portfolio/) · [GitHub](https://github.com/Be1Human)

游戏、动态视觉、AI 与工具。一个独立、轻量的中文个人作品集，展示项目截图，提供分类筛选、项目说明与使用入口，适配桌面和手机。

## 添加或更新作品

1. 把封面图放到 `assets/images/`。
2. 阅读项目自己的说明和配置，再编辑 `data/projects.json`，填写真实项目名称、项目形态（`kind`）、用途与功能、类别、图片、标签、入口、仓库及说明链接（`documentation`）。
   在 `data/content-sources.json` 记录说明文件的固定提交版本与介绍依据，说明链接必须对应该记录。
3. 运行 `npm run build`，生成发布用的 `index.html`。
4. 运行 `npm run check` 检查数据和页面，提交并推送到 `main`。

GitHub Pages 从 `main` 分支的根目录发布，推送后自动更新。仓库内的 `index.html` 是完整静态页面，无需在 GitHub 上安装依赖或运行构建。关闭 JavaScript 时也能浏览全部作品；分类筛选需要 JavaScript。

类别为 `games`（游戏项目）、`visuals`（动态视觉）、`tools`（AI 与工具）。数组顺序就是展示顺序；首页分类数量由构建脚本计算。文案和布局在 `src/index.template.html`，样式在 `assets/styles.css`，筛选逻辑在 `assets/app.js`。不要直接编辑生成的 `index.html`。

每件作品也可用 `#作品ID` 直达，例如 [MineClaw](https://be1human.github.io/portfolio/#mineclaw)。

## 本地预览

安装 Node.js 22 或更高版本，无第三方 npm 依赖。

```sh
npm run build
npm run check
npm start
```

打开 [本地主页](http://127.0.0.1:4174/portfolio/)。也可以用普通静态服务器提供仓库根目录。所有站内资源使用相对路径，适用于 GitHub Pages 项目子目录。

## 内容与配图

初始作品来自 Be1Human 的 7 个公开项目。配图来源和固定版本见 [CREDITS.md](CREDITS.md) 与 `data/sources.json`；介绍所依据的 README、配置文件、版本和相关发行页记录在 `data/content-sources.json`。

产品介绍概括项目文档所述的用途与功能，区分桌面应用、浏览器游戏、学习 Demo、AI 伙伴项目和 Agent Skill。每张卡片的“项目说明”链接指向本次核对的固定版本。文案核对不等于重新运行全部产品；运行测试与可用范围以各项目的验证记录为准。

页面区分实际渲染、实际游戏画面、演示数据和项目标志；Hades 项目标为非官方、非商业学习 Demo。作品、商标、截图和第三方资源的权利仍以各来源项目声明为准。

本站没有登录、表单、第三方统计、远程字体或访客数据存储。访问作品链接时会进入相应项目的站点或 GitHub 页面。
