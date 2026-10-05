# Movie Hunter 第一批优化审阅

基线 `512f001e359ef9bb5580768d41f54e332f951fbd`，2026-10-05；全部验证在云环境本地完成；后续已获授权将代码同步至 `codex/recommendation-polish` 功能分支，未部署、合并或创建 PR。原视觉（黑底、青色星尘、海报与衬线片名）保留。

## 结果与证据

| 问题 | 原提交实测 | 本批结果 |
| --- | --- | --- |
| 推荐范围矛盾 | jazz + 获得思考：7 部展示，提示只有 1 部契合 | 首批与刷新共享相关集合，只返回 Soul；没有合适影片时明确说明心情与筛选共同限制 |
| 浏览电影等待 | 约 1.776 秒才能再次交互 | 0.073 秒（单次本地测量），160ms 淡入不锁交互；问答仍保留星尘转场 |
| 小屏正文拥挤 | 320px 下理由与简介挤在右栏 | 海报与标题保留双栏，理由、简介、评分与操作跨全宽；无横向溢出 |
| 文案对比 | 非活跃缩略图 3.95:1；计数分母 4.11:1 | 分别 10.08:1、8.42:1，缩略图只降低图片透明度，不再降低文字透明度 |
| 小缩略图加载大资源 | 69px 缩略图请求 Paddington 原图 1,532,080 bytes | 请求 8,822 bytes WebP，减少 99.42%；主图 74,180 bytes（减少 95.16%） |
| 发布包无法直接进行 Node 回归 | 两处 CommonJS 相对路径指向仓库外 | 修正路径，使用内置 node:test，无新增运行时依赖 |

对比度来自浏览器 computed style、祖先透明度与黑底合成计算，截图已检查；未穷举星尘动画每一帧的像素背景，不代表完整 WCAG 合规认证。性能数字为同一云环境的单次本地 Chromium 测量，不是线上用户分位值。

## 流程截图与健康情况

1. 心情输入：正常，保留原风格；Enter、Shift+Enter、中文 IME 组合输入通过。[改前](screenshots/01-baseline-desktop-mood.png) / [改后](screenshots/04-after-desktop-mood.png)。首次基线截图处于初始动画中，已拒绝并从未修改的原提交服务重新捕获稳定画面。
2. 观影感受：正常，单选和下一步可用。[390px 截图](screenshots/13-1-mobile-feeling.png)。
3. 类型筛选：正常，多选 OR 语义保持。[截图](screenshots/13-2-mobile-genres.png)。
4. 片长筛选：正常，严格上限保持。[截图](screenshots/13-3-mobile-duration.png)。
5. 地区筛选：正常，多选 OR 语义保持。[截图](screenshots/13-4-mobile-regions.png)。
6. 推荐与浏览：原有范围矛盾、等待和移动阅读问题已修复。[原 jazz 推荐](screenshots/02-baseline-desktop-results.png) / [修正后单结果](screenshots/05-after-jazz-one-result.png) / [桌面](screenshots/07-after-desktop-results.png) / [320px](screenshots/08-after-mobile-results.png) / [英文 320px](screenshots/09-after-mobile-english.png)。
7. 换组、耗尽和重开：正常，7/7/5 共 19 部无重复，耗尽按钮禁用且保留最后一组，重置后可重新出现之前影片。[耗尽](screenshots/11-after-exhaustion.png) / [零结果](screenshots/06-after-empty-result.png)。
8. 选定影片与返回：浏览器断言通过；未单独保存确认屏截图。

同查询桌面对比：[改前](screenshots/12-before-comfort-comparison.png) / [改后](screenshots/12-after-comfort-comparison.png)。图片及请求详情：[asset-comparison.json](asset-comparison.json)。

## 验证

- `node --test tests/*.test.cjs`：3 个测试通过，含 256 组查询矩阵，每组遍历所有刷新轮次；覆盖类型/地区 OR、严格片长、主题匹配、首批/刷新一致性、去重、零结果、耗尽与清空历史。
- `python3 qa/browser_qa.py`：通过。桌面 1440px、320px 中英布局、720 CSS px（1440px 的 200% 缩放布局等效检查）、零/一/不足七部、选择返回、8 次快速切换、箭头键与焦点保留、暂停和系统减少动态、重置、多筛选、resize/动态设置/合成 visibilitychange 中断。页面 JS 错误 0。[结果](browser-results.json)。
- `python3 qa/input_qa.py`：通过。IME Enter 不提交，Shift+Enter 换行，触屏点击，合成 swipe/pointercancel。[结果](input-results.json)。
- `python3 qa/artwork_qa.py`：通过。独立无缓存上下文阻断图片、延迟图片 5 秒；确认 naturalWidth=0 时推荐页面分别约 2.16/2.314 秒可用，仍能选定影片。[结果](artwork-results.json)。
- `git diff --check`、JavaScript 语法检查：通过。
- 已肉眼检查桌面/移动关键完整截图、其余截图总览及 WebP 主海报。未安装新依赖或加入外部服务。

复现：从仓库运行 `python3 -m http.server 8080`，在另一个终端运行上述脚本。Python 浏览器脚本需要 Playwright 与 `/usr/bin/chromium`（本云环境已提供）。`qa/asset_qa.py` 还需要将原提交单独解包并在 8081 提供服务，不改变当前代码。

## 边界、风险与下一步

- **线上验证受阻**：`https://senzguang-web.github.io/movie-hunter/` 返回代理 CONNECT 403，Chromium 报 ERR_TUNNEL_CONNECTION_FAILED。线上可用性、真实网络性能和部署产物未验证；不是已证实的线上故障。
- **未运行**：Safari/Firefox、真机、真实 OS 后台冻结、真实浏览器 200% zoom、屏幕阅读器朗读、完整 axe/WCAG 审计、Lighthouse/Web Vitals、音频播放。后台与 swipe 是合成事件，不能替代真机。
- 统一相关集合后，首批可能更短甚至为空，这是明确的语义修复。编辑标签仍然有限；下一步优先补充片库/主题标签，增加透明的无结果恢复路径及结果页直接修改片长入口。
- 保留了阶段切换约 2 秒的仪式性动效；下一轮可依据真实使用反馈优化问答耗时。片间浏览已经独立提速。
- 新 WebP 及来源记录已加入发布清单；上游源项目若重新执行 export:pages，应先回移本批修复，以免发布包变更被覆盖。
- 本批没有发布授权；下一步审阅后再决定是否创建 draft PR，不能直接部署。

## 授权后的代码同步

仅同步 `codex/recommendation-polish`；main 保持基线。推送前检查：远端分支尚不存在；当前提交和变更没有 `.github/workflows`；GitHub 最近部署记录均为 main 的 `dynamic/pages/pages-build-deployment`。Pages 设置 API 在可用连接中不受支持，但现有 main 动态部署记录与新分支隔离。功能分支不新增部署配置。
