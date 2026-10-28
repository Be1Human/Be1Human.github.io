# CLOUD BOY · 个人作品集

[访问主页](https://be1human.github.io/portfolio/) · [GitHub](https://github.com/Be1Human)

游戏、动态视觉、AI 与工具。一个独立、轻量的中文个人作品集，展示真实项目截图，提供分类筛选、项目入口与源码链接，适配桌面和手机。

## 添加或更新作品

1. 把封面图放到 `assets/images/`。
2. 编辑 `data/projects.json`，参照已有作品填写标题、介绍、类别、图片、标签、入口和仓库链接。
3. 运行 `npm run build`，生成发布用的 `index.html`。
4. 运行 `npm run check` 检查数据和页面，提交并推送到 `main`。

GitHub Pages 从 `main` 分支的根目录发布，推送后自动更新。仓库内的 `index.html` 是完整静态页面，无需在 GitHub 上安装依赖或运行构建。关闭 JavaScript 时也能浏览全部作品；分类筛选需要 JavaScript。

类别为 `games`（游戏实验）、`visuals`（动态视觉）、`tools`（AI 与工具）。数组顺序就是展示顺序；首页分类数量由构建脚本计算。文案和布局在 `src/index.template.html`，样式在 `assets/styles.css`，筛选逻辑在 `assets/app.js`。不要直接编辑生成的 `index.html`。

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

初始作品来自 Be1Human 的 7 个公开项目。来源和固定版本见 [CREDITS.md](CREDITS.md) 与 `data/sources.json`。

页面区分实际渲染、实际游戏画面、演示数据和项目标志；Hades 项目标为非官方、非商业学习 Demo。作品、商标、截图和第三方资源的权利仍以各来源项目声明为准。

本站没有登录、表单、第三方统计、远程字体或访客数据存储。访问作品链接时会进入相应项目的站点或 GitHub 页面。
