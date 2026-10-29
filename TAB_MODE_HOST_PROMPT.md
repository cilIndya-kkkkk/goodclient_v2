# 任务：GoodClient Tab Mode 外壳页重构（交给 DeepSeek V4.1 Flash）

你接手的是一个改版 Territorial.io 客户端（FX Client 的分支，仓库 `~/goodclient_v2`，Termux / Android 环境，zsh）。用户说中文，回复用户请用中文；代码、注释、提交信息用英文。界面文字默认英文，中文翻译放在 `src/i18n.js` 的 `ZH` 字典里。

这份文档里的「用户已确认的需求」优先级最高。和 `TAB_MODE_HOST_HANDOFF.md` 冲突时，以本文为准。

---

## 0. 工作守则（必须遵守）

1. **先读后改。** 改任何文件前先完整读一遍相关代码。不要凭记忆猜函数名、变量名、DOM id。
2. **小步修改，每个阶段结束都要构建一次。** 构建失败先修好，再进入下一阶段。
3. 构建命令（只用这两个）：
   ```bash
   cd ~/goodclient_v2
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build-client   # 只打包客户端，快，用于日常检查
   npm run build-only     # 打补丁 + 打包，GitHub Actions 用这个，阶段结束必须跑通
   ```
   **禁止** `npm run build`（会下载新版游戏然后失败）。**禁止**修改 `game/latest.js`。webpack 的 “asset size limit” 警告可以忽略。
4. 游戏的混淆变量名**只允许使用下面已经验证过的**，不要自己去猜别的：
   - `window.c.gG`：游戏自带的「隐藏 UI」布尔值。
   - `window.nr.nE(bool)`：切换隐藏 UI（游戏自带快捷键调用的也是它）。注意：在主菜单（`c.bH === 0`）时调用无效，所以要轮询重试；开新局会把 `gG` 重置，所以要持续轮询。
   - 游戏只在 resize 时读取 `window.devicePixelRatio`（`build/game.js` 中的 `aHr`），并且监听 `window` 的 `resize` 事件。
5. **已知坑**（不要再踩一遍）：
   - 游戏（`build/game.js` 里的 `aI2.b`）会删除 `document.body` 下**直接子级**的 `DIV` / `INPUT` / `BUTTON`。在客户端页面里，FX 的 UI 要么挂在 `#windowContainer`（一个 `SPAN`）里，要么定时重新挂回去。外壳页面不加载 `game.js`，所以外壳页面不受这个影响。
   - Service Worker（`static/sw2.js`）按**完整 URL** 缓存所有请求。新页面、iframe 的地址都必须带 `?v=<buildTimestamp>`，否则会拿到旧缓存。
   - **iframe 绝不能移动 DOM 位置（reparent），也绝不能改 `src`**，否则会重新加载、对局丢失。互换只能改 CSS（`left/top/width/height/z-index/visibility`）。
   - 游戏开启隐藏 UI（`gG === true`）时会吞掉地图上的原生点击，这是预期行为，不要去修。
6. Git：
   - 每个阶段完成且 `build-only` 通过后提交一次，提交信息参考已有风格（`feat: ...`、`fix: ...`、`docs: ...`）。
   - **不要 push**，除非用户明确要求。用户要求 push 时，用 SSH：`git push git@github.com:cilIndya-kkkkk/goodclient_v2.git goodclient_v2`。
   - 不要用 `git add -A` 把 `build/`、`node_modules/` 之类的东西加进去，先看 `git status`。
7. 这个环境**没有浏览器自动化测试**。你只能保证构建通过、逻辑自洽，最后要给用户一份手动测试清单。
8. 遇到本文没覆盖、而且会影响用户体验的选择时，停下来问用户，不要自己拍板。

---

## 1. 必读文件（按顺序）

1. `TAB_MODE_HOST_HANDOFF.md`（背景、踩坑记录、验收标准）
2. `HANDOFF.md`（整体项目状态）
3. `src/main.js`、`src/tabMode.js`、`src/toolbox.js`、`src/settings.js`、`src/musicPlayer.js`、`src/i18n.js`、`src/customLobby.js`、`src/windowManager.js`、`src/automationControls.js`、`src/theme.js`
4. `static/index.html`、`static/bot.html`、`static/sw2.js`、`static/main.css`（重点看 `#fxToolbox*`、`#fxMusic*`、`#fxTabMode*` 这几段）
5. `build.js`、`package.json`、`.github/workflows/*.yml`

---

## 2. 当前状态

- 最近的提交：`2936163 docs: add Tab Mode host refactor handoff`。
- **工作区里有还没提交的改动**（handoff §10 的「最小下一步」，已经通过 `build-client` 和 `build-only`）：
  - 新增 `static/bot.html`：客户端页面，但没有 SW 注册和更新提示；内联脚本保证 URL 里一定有 `?bot=1`。
  - `build.js`：给 `index.html` 和 `bot.html` 都打上 buildTimestamp。
  - `src/tabMode.js`：`isTabBotInstance()` 同时认 `bot=1`、`tabbot=1` 和以 `bot.html` 结尾的路径；iframe 加载 `bot.html?bot=1&v=<stamp>`，stamp 取自 `fx.bundle.js?<stamp>` 这个 script 标签，`relay` 参数会一起带过去。
  - `TAB_MODE_HOST_HANDOFF.md`：§10 末尾加了进度说明。
- **第 0 步**：先 `git status` / `git diff` 确认这些改动，跑一次 `npm run build-only`，然后提交：`feat: load Tab Mode bot from minimal bot.html`。

现在的 Tab Mode 是这样的：主客户端是顶层页面，自己创建一个 `Bot` 浮动按钮和一个小窗，小窗里只有一个 iframe（bot）。这种结构做不到互换，音乐也不可能独立于两个客户端之上。这就是这次要重构的原因。

---

## 3. 用户已确认的需求（权威）

1. **网址不变，直接变成外壳页。** 用户平时打开的 `.../goodclient_v2/`（也就是 `index.html`）变成一个很薄的**外壳页面**，里面同时装着：主客户端 iframe、bot iframe（懒加载）、Tab Mode 小窗的外框、`Bot` 按钮、音乐播放器。
   - 原来的完整客户端搬到 **`client.html`**，直接打开 `client.html` 也要能当普通客户端用。
   - 只维护**一套** Tab Mode 实现：删掉客户端内部那套旧的 Tab Mode（`initTabMode` 里的按钮、面板、iframe）。
2. **音乐独立于所有东西之上。** 音乐不属于游戏，所以音乐播放器只运行在外壳页里，层级比两个 iframe 和小窗都高。主客户端、bot 被嵌入时都**不**初始化音乐。互换、关闭小窗、主客户端在游戏内重载，音乐都不能中断。
3. **互换后，bot 就是正常界面。** 点小窗**标题栏上的「互换」按钮**：
   - bot 换到全屏主区域：关掉 clean view，显示游戏 UI，显示 **bot 自己的 Tools**。
   - 主客户端换进小窗：开启 clean view，隐藏它的 FX UI。
   - 再点一次换回来。全过程**不刷新任何 iframe**，对局不能丢。
4. **bot 的 Tools 是简配版，不是套娃。** 只保留 Automation 那一组：`All On`、`All Off`、`Opening`、`Infinite`、bot 模式下拉框（`Bot Off` / `V20 Reserve` / `Land Max` / `Messiah`），以及同一区块里的 `Bot send` / `Bot rate` 两个滑条。
   - **不要**：Bot settings 区块（不能套娃）、Opening 策略编辑器和预设、Display、Theme、Status、音乐按钮、FX Settings。
   - 两个滑条是否保留，你实现完后跟用户确认一下（用户原话是「opening inf 和 botv20 那一堆」）。
   - bot 里不要初始化游戏内的 `#demonAutomationControls` 浮动面板；如果你觉得有必要加，先问用户。
5. **关闭小窗后：**
   - 用户不能再对 bot 做任何操作：不可见、不能点、不能拿到键盘焦点。
   - 但 bot **不能卸载**；如果正在对局，bot 的自动化必须继续运行（tick 要继续前进）。
   - 如果关闭时处于互换状态（主客户端在小窗里），先自动换回来，再关闭。主客户端永远不能被藏起来。
6. **小窗的位置和大小都要记住**（localStorage，刷新后恢复）。
   - 位置：拖动标题栏（已经有拖动逻辑）。
   - 大小：用**主客户端 Tools → Bot settings 里的滑条**调（宽、高各一个滑条，单位 px；最小 260×190，最大不超过视口）。拖动滑条时小窗实时变化。

---

## 4. 目标架构

### 4.1 页面

| 文件 | 作用 | SW 注册 / 更新提示 | 加载的脚本 |
|---|---|---|---|
| `static/index.html` | **外壳页**：两个 iframe + 小窗外框 + Bot 按钮 + 音乐 | **有**（只在这里） | `host.bundle.js?buildTimestamp` |
| `static/client.html` | 主客户端（就是现在 `index.html` 的 body 和脚本） | **没有** | `variables.js`、`fx.bundle.js`、`game.js` |
| `static/bot.html` | bot 客户端（已经存在） | 没有 | 同上 |

- `index.html` 保留 `<head>` 里的 meta / manifest / og 标签、SW 注册脚本和 `#updateNotification`（这一块不要放进会被游戏清理的位置；外壳不加载游戏，可以直接放 body 里）。
- `client.html` = 现在 `index.html` 的内容去掉 SW 注册脚本和 `#updateNotification`。被外壳嵌入时地址是 `client.html?host=1&v=<stamp>`。
- 外壳要把自己 URL 上的 `relay`、`lang` 参数转给两个 iframe；`#lobby=...` 这种 hash 转给主客户端 iframe（初始化时拼进 src，之后监听 `hashchange` 时改 `mainFrame.contentWindow.location.hash`，**不要改 src**）。
- `manifest.json` 的 `start_url: "."` 不用动，它本来就指向外壳。

### 4.2 构建（`build.js`）

- webpack 改成两个入口：`fxClient: ./src/main.js` 输出 `fx.bundle.js`，`host: ./src/host/main.js` 输出 `host.bundle.js`。用 `output.filename` 函数按 chunk 名区分，并检查一下动态 import 产生的 chunk（现在有 `367.fx.bundle.js`）的命名，不要冲突。
- `game/build_artefacts.js`（里面有 `buildTimestamp` 和 `dictionary`）**只**拼到 `fx.bundle.js` 前面，外壳不需要。
- 打 stamp 的页面列表改成 `index.html`、`client.html`、`bot.html`（现在的循环加一项就行），`sw2.js` 照旧。
- 外壳读取自己的 stamp：从 `host.bundle.js?<stamp>` 这个 script 标签里取（和 `tabMode.js` 里 `currentBuildVersion()` 的做法一样），用它拼 iframe 的 `?v=`。

### 4.3 外壳页布局（`src/host/`）

- `#fxMainFrame` 和 `#fxBotFrame` 都是 `body` 的直接子元素，`position: fixed`，**创建之后永远不移动、不改 src**。bot iframe 第一次打开小窗时才创建。
- 小窗外框 `#fxTabMode` 包含标题栏（标题、状态文字、`互换`、`重载 bot`、`关闭`）和一块空的占位区 `#fxTabModeSlot`。每次布局时读取占位区的 `getBoundingClientRect()`，把「当前在小窗里的那个 iframe」摆到这个矩形上。
- 「当前在全屏的那个 iframe」设为 `inset: 0`。
- 层级从下到上：全屏 iframe < 小窗外框 < 小窗 iframe < Bot 按钮 < 音乐按钮 / 音乐面板 < 更新提示。
- 会触发重新布局的情况：拖动、改大小、互换、打开、关闭、`window` 的 resize。
- 关闭状态：bot iframe 设 `visibility:hidden; pointer-events:none;`，加上 `inert`，如果它有焦点就 blur。**然后必须验证** bot 在关闭状态下 tick 仍在前进（看 `botFx.openingAutomation.lastTick`）。如果浏览器节流导致 tick 停住，改成「`opacity:0` + `pointer-events:none` + `inert`，iframe 留在原位不隐藏」作为后备方案，并在文档里写清楚用了哪种方案、为什么。
- 互换后，用 `frame.contentWindow.focus()` 把键盘焦点给全屏那一边。
- 小窗矩形持久化：`localStorage["fx_tabmode_window_rect"] = {left, top, width, height}`，恢复时先夹到视口范围内。旧的 `fx_tabmode_panel_position` 可以读一次做迁移。
- 外壳在 `window.__fxHost` 上暴露同源 API（客户端通过 `window.parent.__fxHost` 调用）：
  ```js
  window.__fxHost = {
    tabMode: { open, close, toggle, reload, swap, isOpen, isSwapped, getBotFx, getRect, setSize(width, height) },
    music,                     // musicPlayer 的返回值（open/close/play/next/previous）
    requestFullscreen(),       // 对外壳的 documentElement 全屏
    forceReload(),             // 注销 SW、清缓存、给顶层 URL 加 ?v= 后刷新外壳
    getTopUrl(),               // 外壳 URL，不带 hash
  };
  ```

### 4.4 外壳里的音乐

- 外壳的 bundle 导入 `src/musicPlayer.js` 和 `src/i18n.js`，调用 `initI18n()` 和 `initMusicPlayer()`。外壳页的 `<head>` 也引用 `main.css?buildTimestamp`，这样音乐、小窗的样式可以复用。
- **自动播放手势**：浏览器要求用户先交互才能播放。用户点的是 iframe 里面，事件不会冒泡到外壳的 document。所以外壳要在每个 iframe 的 `load` 事件里，给 `iframe.contentDocument` 加捕获阶段的 `pointerdown` / `keydown` / `touchstart` 监听，把手势转发给音乐播放器。可以给 `musicPlayer.js` 加一个小的导出方法，例如 `notifyUserGesture()`，然后外壳调用它。
- 客户端里的 Tools → `Music player` 按钮改成调用 `window.parent.__fxHost?.music?.open()`；客户端没被嵌入时，还是调用自己的 `__fx.musicPlayer`。

### 4.5 客户端里的实例判断（新建 `src/instance.js`）

把所有「我是谁」的判断集中到一个文件里，其他模块都从这里导入：

```js
export function isBotInstance()   // 现在 tabMode.js 里那套判断：bot=1 / tabbot=1 / 路径以 bot.html 结尾
export function getHost()         // 同源时返回 window.parent.__fxHost，否则返回 null（读取放在 try/catch 里）
export function isEmbedded()      // Boolean(getHost())
```

`src/main.js` 按下表初始化：

| 模块 | 主客户端被嵌入 | bot | 直接打开 client.html |
|---|---|---|---|
| i18n | ✅ | ✅（需要中文界面） | ✅ |
| 音乐 | ❌（在外壳里） | ❌ | ✅ |
| 旧的客户端内 Tab Mode | ❌（删掉） | ❌ | ❌（删掉） |
| Tools | 完整版 + Bot settings | **简配版** | 完整版，不显示 Bot settings |
| theme / shipRoutes / automationControls | ✅ | ❌ | ✅ |
| cleanView 控制器 | ✅ | ✅ | ✅（默认关闭） |

`initToolbox` 加一个参数，例如 `initToolbox({ variant: "full" | "bot" })`。简配版只拼 Automation 区块；`render()` 里所有只属于完整版的部分都要判断一下，不能在简配版里访问不存在的元素。

### 4.6 cleanView 控制器（两个客户端页面都要有）

在 `src/cleanView.js` 里实现，挂到 `window.__fx.cleanView`：

```js
setEnabled(enabled, { hideFx = true, lowDpr = true } = {})
isEnabled()
```

- 开启时：每 500 ms 检查一次，如果 `c.gG !== true` 就调用 `nr.nE(true)`，直到关闭为止；`hideFx` 为真时给 `document.body` 加 `fx-clean` class。
- 关闭时：停止轮询；如果 `c.gG === true` 就调用 `nr.nE(false)`，同样要在菜单状态下重试，直到成功或者超时；移除 `fx-clean`。
- CSS（放在 `main.css` 里）：`body.fx-clean` 下隐藏 `#fxToolboxToggle`、`#fxToolbox`、`#fxMusicToggle`、`#fxMusic`、`#demonAutomationControls`，以及 FX 的 `.window` 窗口。不要隐藏 `#canvasA`。
- **DPR**：在 `game.js` 加载之前（`main.js` 顶部，`fx.bundle.js` 比 `game.js` 先加载），给两个客户端页面都把 `window.devicePixelRatio` 换成一个动态 getter：`lowDpr` 且 clean 开启时返回 1，否则返回真实值（覆盖之前先保存原始值）。DPR 变化后派发一次 `window.dispatchEvent(new Event("resize"))`，让游戏重新读取。这样 bot 换到全屏时不会模糊，小窗里依然省性能。
- 删掉旧的 `initBotCleanView()` 和 `__fx.botCleanView`。
- 状态约定：默认主客户端 `clean=false`、bot `clean=true`；互换后主客户端 `clean=true`、bot `clean=false`。bot 刚加载完时由外壳设置 clean（在 iframe 的 `load` 里，并持续重试，直到 `__fx.cleanView` 存在）。

### 4.7 设置隔离（必须做）

现在主客户端和 bot 共用 `localStorage["fx_settings"]`，一边改了自动化开关，另一边下次刷新就会读到。现在两边会同时常驻，这个问题会更明显。

- 在 `src/settings.js` 里引入常量 `SETTINGS_KEY = isBotInstance() ? "fx_settings_bot" : "fx_settings"`，替换掉文件里所有 `"fx_settings"` 字面量（大约 7 处，先 grep 一遍）。
- bot 第一次启动、`fx_settings_bot` 还不存在时，从 `fx_settings` 复制一份作为初始值。
- `fx_automation_enabled_for_hostfix` 这个迁移标志也按实例区分，或者确认它对 bot 没有副作用。
- bot 的 Tools 面板和按钮位置用单独的 key（例如在 key 后面加 `_bot`），免得和主客户端的位置互相覆盖。
- `fx_ui_language` 两边**共用**（语言应该一致），不要改。

### 4.8 客户端里「以为自己是顶层页面」的地方

用 `getHost()` 判断是否被嵌入，被嵌入时：

- `settings.js` 的 `forceReload()`（更新检查器在用）→ 调用 `getHost().forceReload()`。
- `settings.js` / `windowManager.js` 的 `tryEnterFullscreen()` → 调用 `getHost().requestFullscreen()`（否则只有 iframe 自己会全屏）。
- `customLobby.js` 的「Copy link」→ 用 `getHost().getTopUrl()` 生成链接，不要用 iframe 的 `location.href`。
- 设置保存、导入、重置时的 `location.reload()`：只刷新所在的 iframe，可以接受，不用改。但要确认：bot iframe 刷新后仍然是 bot，而且外壳会重新给它设置 clean 状态。

### 4.9 主客户端 Tools → Bot settings

- 原来通过 `window.__fx.tabMode` 访问 bot；被嵌入时改成指向 `getHost().tabMode`，这样 `toolbox.js` 里现有的 `getBotFx()` / `reload()` 基本不用改。
- 删掉文字里「点击 Bot 按钮加载」这类不再准确的提示，或者改成准确的说法。
- 新增两个滑条：`Window width`、`Window height`，调用 `getHost().tabMode.setSize(w, h)`，并显示当前值。
- 没有被嵌入时（直接打开 `client.html`），整个 Bot settings 区块不显示。
- 所有新增的界面文字都要在 `src/i18n.js` 的 `ZH` 字典里加翻译，例如 `Swap` → `互换`、`Window width` → `窗口宽度`、`Window height` → `窗口高度`、`Main client` → `主界面`。外壳里新增元素的 id 如果不在 i18n 的 `ROOTS` 列表里，要加进去。

---

## 5. 建议的实施阶段

每个阶段：实现 → `npm run build-client` → `npm run build-only` → 提交。

0. 提交工作区里已有的 bot.html 改动（见 §2）。
1. 新建 `src/instance.js` 和 `src/cleanView.js`，加上动态 DPR，做 §4.7 的设置隔离；`main.js` 改用新模块；删掉 `initBotCleanView`。这一阶段结束时，旧的单 iframe Tab Mode 要仍然能用。
2. Tools 增加 `variant`，bot 使用简配版（§3 第 4 条）。
3. 页面拆分：把 `index.html` 的内容移到 `client.html`；新写外壳 `index.html`；`build.js` 改成双入口并给 3 个页面打 stamp。外壳先只放一个全屏主客户端 iframe 和音乐，确认能正常进游戏、音乐正常。
4. 外壳 Tab Mode：Bot 按钮、小窗外框、懒加载 bot iframe、拖动、记住位置和大小、关闭行为（§3 第 5 条和 §4.3）、`__fxHost` API。删掉客户端里的旧 Tab Mode。
5. 互换：标题栏按钮、两边 cleanView 状态、焦点、布局（§3 第 3 条）。
6. 收尾：§4.8 的几处修改、Tools 的大小滑条、i18n 翻译、CSS，以及更新 `HANDOFF.md` 和 `TAB_MODE_HOST_HANDOFF.md`（写清新架构、用户的决定、关闭状态最终用了哪种方案、还没解决的问题）。

---

## 6. 完成标准

**构建：** `npm run build-only` 通过；`build/` 里有 `index.html`、`client.html`、`bot.html`、`host.bundle.js`、`fx.bundle.js`、`game.js`，三个 HTML 里都没有残留的字面量 `buildTimestamp`；只有 `index.html` 里有 `serviceWorker.register`。

**自查**（用 grep 或读代码确认，写进最后的报告）：
- 客户端代码里没有任何地方会改 iframe 的 `src`，或者移动 iframe 的位置。
- `client.html` 和 `bot.html` 里都没有 SW 注册，也没有 `#updateNotification`。
- 被嵌入的主客户端和 bot 都不会初始化音乐。
- 简配版 Tools 里没有 Bot settings 区块。

**交给用户的手动测试清单**（本地预览：`python3 -m http.server 8001 --directory ~`，然后打开 `http://localhost:8001/goodclient_v2/build/`）：
1. 打开网址后是正常客户端，左上角有 Tools、音乐、Bot 三个按钮；直接打开 `client.html` 也能玩。
2. 点 Bot 打开小窗：bot 是 clean 画面，没有更新提示，Tools 被隐藏。
3. 关闭小窗再打开，bot 不会重载；在对局中关闭小窗，bot 的 tick 继续前进（看主客户端 Tools → Bot settings 里的状态行）。
4. 小窗关闭时点不到 bot，键盘也不会作用到 bot。
5. 拖动标题栏、拖动 Tools 里的宽/高滑条，小窗跟着变化；刷新后位置和大小都恢复。
6. 点「互换」：bot 全屏、显示游戏 UI 和简配 Tools，主客户端在小窗里是 clean 画面；再互换回来两边恢复；全程对局不中断，画面不模糊。
7. 互换状态下点「关闭」：先自动换回，再关闭。
8. 开新局后，clean 状态会自动重新生效。
9. 音乐在互换、关闭小窗、主客户端刷新时都不中断，并且显示在所有东西的上面；第一次点游戏画面就能触发自动播放。
10. 中文界面下，新增的按钮和文字都有翻译。
11. 原有功能还在：开图预设、更新检查、航线、队伍标签、出生点名字、大厅分队、自定义大厅链接、全屏模式。

---

## 7. 不能破坏的东西

- `npm run build-only` 能跑通，`game/latest.js` 不动。
- 音乐播放器的 ID3 标签读取、自带曲目、本地文件（IndexedDB）。
- i18n：默认英文 + 中文字典。
- 开图预设、更新检查、航线、队伍标签、出生点标签、大厅分队、自定义大厅。
- `src/openingAutomation.js` 现有的 API。
- `~/tulipbot` 已搁置，不要碰。

---

## 8. 最后给用户的报告（用中文，简洁）

- 做了什么：按阶段列出，每阶段附上提交的 hash。
- 关闭状态用了哪种方案（visibility 还是 opacity），原因是什么。
- 已知限制，例如：主客户端的 Tools 面板如果和小窗重叠，会被小窗挡住（两个 iframe 是不同的层）。
- 需要用户确认的问题：bot 简配版里要不要 `Bot send` / `Bot rate` 滑条；bot 全屏时要不要游戏内的 Automation 浮动面板。
- 手动测试清单（§6）。
- 提醒用户：还没有 push，需要部署时告诉你。
