# Shipping Panel + Tools UI 重构交接

最后更新：2026-10-31

这份文档是给下一位接手的对话用的。**2026-10-31：下面的阶段 A–G 已实现**，当前需要真实对局测试/调参；实现细节和手动测试清单见 `HANDOFF.md`。

## 0. 当前仓库状态

- 仓库：`~/goodclient_v2`
- 分支：`goodclient_v2`
- 写这份文档前的 HEAD：`e704812 feat: add local encrypted account vault`
- 本地比远端领先 3 个提交（accountVault + 两个 cleanView/shipRoutes 修复）；本次文档提交后也会一起推送。
- 游戏已更新到 **Territorial.io 2.16.66（2026-10-30）**，`game/latest.js` 已替换，自动化 g 表 35 个名字。
- 构建只用：
  ```bash
  cd ~/goodclient_v2
  export NODE_OPTIONS="--max-old-space-size=4096"
  npm run build-client   # 只改前端时
  npm run build-only     # 改补丁/最终检查
  ```
  **不要跑 `npm run build`**。
- 本地预览（如服务器还活着）：`http://localhost:8002/goodclient_v2/build/`
- 环境没有浏览器自动化测试，最后必须给用户手动测试清单。

## 1. 用户已确认的需求

### 1.1 删除大厅分队

- 删除 `patches/lobbyTeams.js`、`src/lobbyTeams.js`
- 移除 `src/main.js` 里的 import 和 `__fx.lobbyTeams = initLobbyTeams()`
- 移除 `static/main.css` 里 `#fxLobbyTeams` / `.fx-lobby-team-*` / `.fx-lobby-teams-*`
- 移除 `src/helpContent.js` 里的 “Lobby team split” 条目
- 清理 HANDOFF/TAB_MODE 里的分队说明

### 1.2 船路进度百分比

- **独立开关**：`Show ship progress`，不受 `Show ship routes` 影响。
- 每条船旁显示进度，例如 `42%`。
- 建议放在兵力徽章旁边，或直接在船旁。

### 1.3 前方阻挡：红叉 + 自动撤回

- 对每艘“我的船”检查前方路线附近的敌方船。
- 判断条件：敌方船兵力 **> 我的这艘船兵力**。
- 命中后：
  - 在**我的船**上画红叉（不是敌船）
  - 自动撤回这艘我的船
- 整个行为由 Tools → Shipping 里的独立开关控制，默认关。

### 1.4 船只面板

- 固定在左侧排行榜下方。
- 面板高度可以拖动调整，并记住高度（localStorage）。
- 面板顶部有 `Auto` 开关。
- 列出：
  - 我的船：兵力、进度
  - 攻击这艘船的攻击者：玩家名、兵力
- 我的船后面**没有盾牌**。
- 攻击者行保留手动盾牌按钮（用户已确认要）。
- 面板默认显示；也应有 Tools 开关。

### 1.5 颜色规则

攻击者船兵力与**我的总兵力**比较：

- `< 10%` → 红色
- `>= 10%` → 紫色

注意：阻挡判断仍然是“敌方船 vs 我的这艘船”；颜色比较才是“敌方船 vs 我的总兵力”。

### 1.6 拦截规则

- 计算敌方船路线。
- 当敌船走到路线**最后 10%** 时。
- 发一艘兵力 = 目标敌船兵力 **105%** 的拦截船。
- `Auto` 打开后，对所有符合条件的威胁自动执行。
- 我方总兵力不足 105% 时**跳过**，不要硬发。
- 手动盾牌与 Auto 使用同一套时机/兵力计算。
- 使用游戏自带拦截动作，不伪造协议。

### 1.7 Tools UI 重构

现状：Tools 是一个很长的纵向列表，不好用。

用户要求：

- 主界面放几个**大按钮/卡片**。
- 点大按钮进入详细页，仍在 Tools 窗口框架内。
- 详细页左上角有“返回”，回到主菜单。
- 右上角保留关闭。
- Bot 简配版不需要主菜单，仍然只显示 Automation 详细页。

建议主菜单分组：

1. Automation
2. Opening
3. Shipping
4. Display
5. Bot（只在被嵌入的主客户端显示）
6. Accounts
7. Help

Display 里可以合并现有的 Display + Theme + Status。  
Help 里放 Changelog / Usage Guide。  
Accounts 里放 Account Vault。  
Shipping 里放所有船相关功能。

## 2. 当前代码结构（重要）

- `src/toolbox.js`
  - `initToolbox({ variant: "full" | "bot" })`
  - 目前直接创建所有 section，然后：
    ```js
    if (variant === "full") body.append(infoRow, accountsSection);
    body.append(automationSection);
    if (variant === "full") {
      if (embedded) body.append(botSection);
      body.append(openingSection, displaySection, themeSection, statusSection);
    }
    ```
  - 需要改造成 page 容器 + 主菜单 + 返回。
  - 现有 section 变量都可以保留，只是 append 到不同 page。
  - `render()` 每 500ms 更新所有控件；隐藏页面里的元素仍要能更新。
  - `openPanel()` 现在直接显示；改版后 full 打开应回到主菜单，bot 直接显示 Automation。
  - header 拖动目前只忽略 `closeButton`；改成忽略所有 `button`，否则返回按钮会触发拖动。
- `src/shipRoutes.js`
  - 已实现船路绘制、颜色、兵力徽章、状态。
  - 现在由 `patches/gc_shipRoutes.js` 调用 `__fx.drawShipRoutes(state)`。
  - 当前 patch 只在 `__fx.settings.showShipRoutes` 为真时调用；要做面板/进度/拦截，必须改成**一直传数据**，绘制由前端根据开关决定。
  - 需要新增 `window.__fx.shipState`（最新帧）和 `window.__fx.shipIntel`（节流后的派生数据）。
- `patches/gc_shipRoutes.js`
  - 新游戏 2.16.66 的船数据：
    - `h0.b1.ka`：船数量
    - `h0.b1.kY`：当前位置（packed）
    - `h0.b1.kw`：owner << 3
    - `h0.b1.kx`：船兵力
    - `h0.b1.pn`：路线数组（每个元素是 tile index）
    - `h0.b1.kv`：当前路线进度索引
    - `h0.b1.kX`：船状态；`%64 === 5` 表示返航中
    - `h0.b1.kZ`：路线段进度
  - 已有注入点：minified 脚本里
    `rE=ey.rE,es=aIa,e2=dE;`
  - 当前传了 `ctx,jO,iz,j6,zg,routes,routeIndex,mapWidth,mapHeight,scale,camX,camY,screenWidth,screenHeight,project,zt,player,humans,colors,colorIds,format`。
  - 需要新增：
    - `recallShip(index)`：调用 `h0.kc.pt(index)`（游戏自带返航/掉头；会反转路线并设置状态 5）
    - `interceptShip(index, percent)`：设置攻击百分比，设置鼠标坐标到目标船当前位置，调用 `aIC.aIJ(2)`（游戏自带 “Intercept Ship At Mouse Pointer”）
    - 可能需要 `shipStatus`（`h0.b1.kX`）来跳过已返航船
    - 可能暴露 `window.__fx.shipControl` 供面板调用
  - 像素/坐标：
    - 像素比例：`d9.o5`
    - 鼠标设置：`aIC.aID(x, y)`，坐标需要乘 `d9.o5`
    - 拦截动作：`aIC.aIJ(2)`；放船是 `aIC.aIJ(1)`；陆地攻击是 `aIC.aIJ(0)`
    - 路线 tile -> packed：`dr.iL(tile)`
    - 当前 packed -> tile：`dr.iM(packed)`
    - 地图宽高：`fU.fV` / `fU.iD`
- `src/accountVault.js`
  - 已有本地 AES-256 密码本，和本次船功能无关。
- 当前游戏 2.16.66 相关：
  - `__fx.gameUi`（cleanView 用）已暴露：`isHidden()` / `setHidden()` / `isSpawnSelection()`。
  - `__fx.openingAutomation.canAttackTarget(target)` 可用于判断敌我。
  - `__fx.botMap.playerAt` / `launchShipAt` 已有。

## 3. 建议实现顺序

### 阶段 A：删分队 + Tools 外壳重构

1. 删除分队文件/初始化/CSS/帮助条目。
2. 把 `toolbox.js` 改成：
   - `menuPage`
   - `automationPage`
   - `openingPage`
   - `shippingPage`
   - `displayPage`
   - `botPage`
   - `accountsPage`
   - `helpPage`
3. header 增加 `backButton`，只在详细页显示；点击回主菜单。
4. 主菜单加大按钮/卡片；CSS 新增 `.fx-toolbox-menu` / `.fx-toolbox-card` / `.fx-toolbox-page` / back 按钮样式。
5. 先搬现有模块，不加新功能；`build-only` 通过、手动确认 Tools 正常。

### 阶段 B：Shipping 设置 + 面板骨架

1. `settings.js` 增加默认值：
   - `showShipProgress`（默认 true）
   - `showShipPanel`（默认 true）
   - `autoRecallBlockedShips`（默认 false）
   - `autoInterceptShips`（默认 false）
   - 面板高度单独存 localStorage：`fx_ship_panel_height`
2. Tools → Shipping 页面放：
   - Show ship routes
   - Show ship progress
   - Show ship panel
   - Auto recall blocked ships
   - Auto intercept
   - Reset panel height / status
3. 把 Display 里原来的 `Ship routes` 按钮移走，避免重复。
4. 新建 `src/shipPanel.js`：
   - 固定左侧、排行榜下方
   - 底部拖拽调整高度
   - 顶部 Auto 开关（与 `autoInterceptShips` 同步）
   - 列表容器
5. 先显示空面板/占位，不接威胁计算。

### 阶段 C：船数据 + 进度

1. 修改 `patches/gc_shipRoutes.js`：**无论 showShipRoutes 开关如何都传状态**，并保存 `window.__fx.shipState`。
2. 在 `src/shipRoutes.js` 内：
   - 根据 `showShipRoutes` 决定是否画路线
   - 根据 `showShipProgress` 决定是否画 `%`
   - 进度：`routeIndex / (route.length - 1)`，clamp 0–1
3. 面板读取 `window.__fx.shipState`，列出我的船：兵力、进度。

### 阶段 D：攻击者 + 颜色

1. 新建 `src/shipIntel.js`，输入 ship state，输出：
   - `myShips[]`
   - 每艘我的船的 `attackers[]`
   - 每艘我的船的 `blockers[]`
   - 每艘船的 progress/screen 坐标
2. 攻击者判断建议：
   - 敌船路线终点/当前位置靠近我的船当前位置或我的船路线；
   - 用 tile 坐标距离（例如 6–10 tiles 内），实机调。
3. 面板显示攻击者：名字、兵力、颜色。
4. 颜色：`attackerTroops < myTotalTroops * 0.1` 红色，否则紫色。
   - `myTotalTroops` 用 `getVar("playerBalances")[getVar("playerId")]`。

### 阶段 E：阻挡 + 红叉 + 自动撤回

1. 对每艘我的船，沿其前方路线采样，找附近敌方船。
2. 敌方船兵力 > 我的船兵力 → `blockers`。
3. `shipRoutes` 在该我的船屏幕位置画红叉。
4. 若 `autoRecallBlockedShips` 开：
   - 调用 `state.recallShip(index)`（`h0.kc.pt(index)`）
   - 用 key（index + owner + route 端点）防止重复撤回
   - 已返航（`kX % 64 === 5`）跳过
5. 实机调“前方/走廊”距离，避免误判。

### 阶段 F：手动盾牌 + Auto 拦截

1. 面板攻击者行加盾牌按钮（我的船行不加）。
2. 统一队列 `pendingIntercepts`：
   - 手动盾牌：把该敌船 index 加入队列
   - Auto：把所有攻击者加入队列（或直接按 90% 规则触发）
3. 每帧/节流检查：
   - 敌船仍然存在、仍攻击我
   - 敌船 progress >= 0.9
   - 我方总兵力足够 105%
   - 调用 `state.interceptShip(index, percent)`
   - `percent = min(1, enemyTroops * 1.05 / myTotalTroops)`
   - 已拦截过的 key 不重复
4. 兵力不足：跳过，按钮置灰或显示“insufficient”。
5. 拦截动作使用 `aIC.aIJ(2)`；如果实测不成功，先在真实对局确认该动作语义，再调整。不要自己造协议。

### 阶段 G：收尾

- 更新 `helpContent.js`：Shipping 说明、Tools 改版说明。
- 更新 `HANDOFF.md` / 本文件。
- `npm run build-only`。
- 给用户手动测试清单。

## 4. 默认值（用户已同意）

- Show ship routes：开
- Show ship progress：开
- Show ship panel：开
- Auto recall blocked ships：关
- Auto intercept：关
- 攻击者行手动盾牌：保留
- 我方船后面：没有盾牌
- 兵力不足 105%：跳过
- 面板位置固定，高度可调
- Tools 主菜单：大按钮 + 详细页 + 左上角返回

## 5. 验收测试

1. 大厅分队入口/窗口完全消失。
2. Tools 主菜单正常；每个大按钮能进详细页，左上角返回；Bot 版只有 Automation。
3. 船路显示和进度显示互不影响。
4. 面板在排行榜下方，可调高度，刷新后高度保留。
5. 面板列出我的船（兵力/进度）和攻击者（名字/兵力）。
6. 攻击者颜色按“我方总兵力 10%”区分红/紫。
7. 阻挡时我的船出现红叉；开关打开时自动撤回，关闭时不撤回。
8. 攻击者行盾牌可手动拦截；顶部 Auto 可自动拦截。
9. 拦截在敌船最后 10% 触发，兵力为目标船 105%；不够就跳过。
10. 原有功能不坏：船路、Tab Mode、攒兵、攻击玩家、放船、密码本、音乐、更新检查、自定义大厅。

## 6. 当前未完成 / 注意

- 本次对话**没有改任何功能代码**，只写了这份交接。
- 分队删除、Tools 改版、Shipping 功能都还没做。
- 当前本地领先远端 3 个提交；本次文档提交后一起推送。
- 游戏刚更新到 2.16.66，船/大厅相关混淆名已重新推导，但还没有真实对局验证；接手后先跑一次 `build-only` 和本地预览。
