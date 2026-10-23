# GoodClient_v2 开发与维护手册

## 一、 项目概述

*   **目标**：以最新的 **FX Client** 为底座，移植 **Omen Client** 的 AI 自动化功能（开图、无限扩张、Bot 自动攻击）。
*   **技术架构**：构建期文本替换（非源码修改）。下载官方混淆代码后，用正则和字典（Dictionary）解析混淆名，注入自定义逻辑，再重新打包。
*   **运行环境**：Termux (Android)。

## 二、 当前文件结构差异清单

### 1. `src/` 目录（前端代码）

**从 Omen 复制来的纯新增文件：**

*   `automationControls.js` — UI 面板。`isInGame()` 仍按真实 `gameState` 判断，因此**面板只在进入对局后显示**（主菜单不显示）。
*   `botAttackRate.js`
*   `defaultOpeningStrategy.js`
*   `infiniteExpansionStrategy.js`
*   `openingAutomation.js` — 核心状态机；`start()` 时会打印 `Opening automation loaded N attacks`。
*   `openingTickOffset.js`
*   `rtt.js` — WebSocket 延迟监测，带 try-catch 容错。

**被修改的 FX 原生文件：**

*   `src/main.js`：顶部提前挂载 `reportError`，容错执行 `installRttHook`，末尾挂载 `__fx.openingAutomation` 和 `__fx.OpeningAutomationInput`。
*   `src/settings.js`：新增 `persistSettings` 导出和 Automation 设置项；用动态读取 `window.__fx.OpeningAutomationInput` 解决循环依赖。
*   `src/keybinds.js`：补了 `getAttackPercentage: () => 0`、`repaintAttackPercentageBar: () => {}` 等兜底。
*   `static/main.css`：**补上了 Omen 的 Automation 面板样式**（`#demonAutomationControls` 等 12 条规则）。之前该样式缺失，面板会以无样式形式出现。

### 2. `patches/` 目录（构建期补丁）

*   `patches/gc_openingAutomation.js` — **已完成完整 AI 钩子移植**：
    *   17 项 `g` 表（当前游戏版本的混淆名）。
    *   构建期 raw-name 校验（12 种访问形态，缺一个就报错）。
    *   从 Omen `patches/patches.js` 抽出的约 1000 行钩子注入（`attackFreeLand`、`attackPlayer`、`findV20ReserveBotAttackTarget`、`findBestLowDensityBorderingBot` 等）。
    *   `onTick` / `onTickAutoAttack` 主循环挂钩。
*   `patches/misc.js`：`__fx.reportError(e, msg)` 改为 `__fx.reportError?.(e, msg)` 防崩溃。
*   `patches/patches.js`：在 keybind 注入处补了 `__fx.keybindFunctions.getAttackPercentage = () => $<attackPercentage>;`。

> 注意：文档旧版提到的 `step_final_auto.mjs` 并不存在；钩子代码是按 Omen 的 `patches/patches.js` 重新提取生成的。

## 三、 核心原理解析（Debug 必读）

1.  **字典机制**：`build.js` 用 `matchCode` / `matchRawCode` 把混淆名映射为可读名（如 `game`、`playerData`、`playerTerritories`），存于 `dictionary`。构建产物 `game/build_artefacts.js` 可查看当前映射。
2.  **`g` 表**：AI 代码高频读取游戏内部对象，所以直接写死混淆名。**每次游戏更新，混淆名都会重排，必须重新推导。**
3.  **ESM 循环依赖**：`settings.js` 与 `openingAutomation.js` 不要静态互相 `import`；`settings.js` 已在函数内动态读取 `window.__fx.OpeningAutomationInput`。

### 当前 `g` 表（Omen 2.16.51 → 本构建）

| 可读名 | Omen 旧名 | 当前名 |
| --- | --- | --- |
| mapData | `ad` | `j1` |
| attackManager | `ae` | `a0n` |
| protocolHandler | `bB` | `ss` |
| teamUtils | `bv` | `a0f` |
| playerTiles | `hF` | `xT` |
| neighborOffsets | `fb` | `a1g` |
| isNeutralTile | `fQ` | `zb` |
| isOwnedTile | `h9` | `zY` |
| getTileOwner | `fR` | `zZ` |
| getAvailableAttackCount | `gg` | `q7` |
| getAttackTarget | `gl` | `q8` |
| getAttackValue | `gm` | `q9` |
| gameCommandSender | `hz` | `a1M` |
| sendAttack | `i6` | `xn` |
| cancelAttack | `r0` | `xr` |
| canAttack | `fS` | `a1W` |
| mapIsRendered | `yl` | `u4` |

推导方法（无 `../deobfuscate` 时也可用）：

1.  以 `~/omenclient/game/latest.js` 为参照（其 `g` 表已知）。
2.  用 UglifyJS 按本项目相同参数压缩当前 `game/latest.js`：`compress:{arrows:false}, mangle:false`。
3.  对参照脚本中每个 `ad.fb`、`ad.fQ(` 等锚点取上下文 token 窗口，把标识符统一替换成占位符后，在当前脚本中做精确子序列匹配。
4.  匹配成功后，同一位置的标识符就是新混淆名。
5.  必须确认 12 种访问形态在压缩后的脚本中各存在（`patches/gc_openingAutomation.js` 会在构建时自动检查）。

## 四、 当前进度与测试步骤

钩子已成功注入，`npm run build` 输出包含：

```
Opening automation hooks injected (g table: 17 names)
```

**测试步骤：**

1.  启动预览：`python3 -m http.server -d build 8000`（或复用当前已运行的服务）。
2.  浏览器打开 `http://localhost:8000`，进入**单机对局**（主菜单不会显示面板）。
3.  底部出现 Automation 面板后，点击 **All On**。
4.  控制台应出现：
    *   `Opening automation loaded N attacks`
    *   达到对局 tick 后，开图/自动攻击开始执行。

**常见报错与修复预案：**

*   **构建时报 `Automation raw name check failed for: ...`**：游戏更新了，按第三节重新推导 `g` 表。
*   **运行时 `Cannot read properties of undefined (reading 'xxx')`**：某个 `dict.*` 或 `g.*` 名失效；用 `game/build_artefacts.js` 对照。
*   **`attackBarObject` 相关报错**：keybind 正则与新版游戏不匹配，对照 FX 最新 `patches/patches.js` 修正。
*   **面板不出现**：确认已进入对局；`isInGame()` 要求 `gameState` 为 1 或 2 且不是回放。

## 五、 游戏更新维护手册

当 Territorial.io 更新后：

1.  **先构建**，看 `gc_openingAutomation.js` 的 raw-name 校验是否通过。
2.  若失败，按第三节的 token 对齐法重新推导 `g` 表并替换文件顶部。
3.  **检查 tick 挂钩**：构建日志若没有 `Opening automation hooks injected`，或 `replaceOne` 抛 “no match / more than one match”，说明主循环形态变了；检查 `onTick` 正则：
    ```
    /(this\.\w+=function\(\)\{this\.(\w+)\.(\w+)\+\+)(\})/g
    ```
4.  **检查注入点正则**：
    ```
    /(function \w+\(\)\{)(var \w+=0,\w+=0;this\.\w+=function\(\w+,\w+\)\{)/g
    ```
    该正则必须在压缩后的脚本中恰好匹配一次。

## 六、 Termux 环境备忘

*   **构建内存**：`export NODE_OPTIONS="--max-old-space-size=4096"`。
*   **快速开发**：
    *   只改 `patches/`：`npm run patch`
    *   只改 `src/`：`npm run build-client`
    *   两端都改：`npm run build`
*   **本地预览**：`python3 -m http.server 8000 --directory build`，浏览器打开 `http://localhost:8000`。
*   **注意**：Termux 没有 `/tmp`，后台日志请用 `$TMPDIR`（`/data/data/com.termux/files/usr/tmp`）。
