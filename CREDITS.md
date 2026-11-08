# 内容与素材来源

作品集的公开项目介绍根据 Be1Human 已公开仓库的 README、相关配置与发行附件整理。文字依据、固定版本和说明链接保存在 `data/content-sources.json`；卡片的“项目说明”链接可直接核对原文。其余项目经作者授权，根据工程说明、结构或设计资料整理为独立站内简介；原始私有资料没有随网站发布，源仓库权限保持不变。此次整理未重新运行全部产品，阶段说明不代表新的运行验收。

原有项目的配图从同一账号的公开项目中选取，未替换为生成截图。新增的 13 张概念封面在本仓库以 SVG 绘制，并标注“项目示意图 · 非运行截图”。素材来源与类型保存在 `data/sources.json`。

- **AI Wallpaper Workshop**：蓝天湖景与星空实际渲染截图，来自 [starry-night-train](https://github.com/Be1Human/starry-night-train)。该项目的生成素材、Shader 和第三方来源见其 CREDITS.md。
- **Titan Town**：实际游戏截图，来自 [titan-town](https://github.com/Be1Human/titan-town)。项目内第三方组件与素材声明继续适用。
- **Hades Learning Demo**：学习 Demo 的实际游戏截图，来自 [hades-learning-demo](https://github.com/Be1Human/hades-learning-demo)。这是非官方、非商业学习项目；Hades 及相关商标属于 Supergiant Games 和相应权利人。该截图不是原版游戏画面，使用边界见来源项目的 LICENSE、NOTICE.md 和资源来源文档。
- **MineClaw**：实时感知控制台截图，来自 [MineClaw](https://github.com/Be1Human/MineClaw)。Minecraft 及相关商标属于对应权利人。
- **大小姐的网络手账**：使用演示数据的实际应用截图，来自 [claude-ojousama-network](https://github.com/Be1Human/claude-ojousama-network)。角色是来源项目中的原创同人风格形象，项目不是 Anthropic 官方产品。
- **Video to Game Animation**：同姿势肩袖蒙皮修正前后对比图，来自 [video-to-game-animation](https://github.com/Be1Human/video-to-game-animation)。角色及媒体范围见其 docs/showcase/MEDIA.md。
- **ClawPM**：项目标志，来自 [clawpm](https://github.com/Be1Human/clawpm)。页面网格背景及排字属于本主页的展示设计，不是应用截图。

- **Haimian · 深空外设**：依据作者提供的外设使用教程整理功能介绍，并按小屏、旋钮与按键布局绘制 SVG 设备示意。配图明确标注非运行截图；教程中的原始配置截图与压缩包未随站点发布。

当前电子羊标识、页面布局和样式在本仓库内以 SVG、HTML 和 CSS 绘制。本站展示不改变来源作品和第三方素材的许可证，也不对所有作品作统一开源授权。

## 互动作品集视觉（2026-11）

角色参考由站点作者提供。像素背景与角色视觉经 AI 辅助制作，视频镜头由本地生成流程及超分辨率处理导出；网页使用压缩后的播放素材。章节证件、手记、终端、游戏卡带、登机牌及作品扑克牌由 HTML/CSS 实现。参考演示视频、生成日志、密钥及原始制作工程不属于网站发布文件。新闻原帖配图归原作者，主题图解在卡片上单独标注。

- `assets/images/agent-learning-cover.svg`：本站原创 Agent 学习结构示意；Wiki 页面参考 Prompt Engineering Guide 的知识站阅读方式，正文、示例与图解独立编写，论文与官方文档在各篇末尾逐条列出。

- `assets/images/supervisor-verify-eval.svg`：本站原创调度、验证与评测职责图。用户提供的对照图作为写作主题参考；正文、图解、对照表与情境示例独立编写，原始资料在文章末尾列明。

## 学习文章图文重写（2026-11）

- 论文与作者原图、改绘和原创案例图逐张登记于 `assets/learning/sources-core.json`、`sources-frontier.json`、`sources-evaluation.json`。ReAct 作者原图未改；Snell 等论文曲线保留原始 SVG 与 CC BY 4.0 归属说明。
- `notes-decision.svg`、`notes-inventory.svg`、`notes-reading-map.svg` 为本站原创教学图；数值和轨迹在图说中标明用途。项目已有截图沿用原来源，其中 MineClaw 截图为待连接界面。
- 代码高亮使用 PrismJS 1.30.0 的官方核心与语言语法，MIT；源码与许可证位于 `scripts/vendor/prism.cjs` 和 `prism-LICENSE.txt`，只在构建阶段运行。
- 文字编辑参考 [Humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) 与 [technical-writing](https://github.com/ericrisco/rsc-harness/blob/main/skills/technical-writing/SKILL.md) 的去套话、具体案例和技术表达规则。未复制其示例为项目实现事实。

## Softmax 与 Attention（2026-11）

- 四张教学图由本站的 `scripts/generate-attention-figures.py` 生成；数值严格来自正文设定。曲线与向量图使用 Matplotlib 绘制，交互计算只改变固定分数模型。
- `attention-lost-middle-paper.svg` 为 Liu 等《Lost in the Middle》Figure 1，TACL 2024，原图未修改，依 CC BY 4.0 使用。出处与文件摘要登记于 `assets/learning/sources-attention.json`。
- 参考 Prompt Engineering Guide 多篇教程的主题组织方式；正文按各技术机制独立编写，不沿用其历史 SDK 代码。
