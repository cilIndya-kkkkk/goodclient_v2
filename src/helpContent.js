export const CHANGELOG = [
  {
    date: "2026-10-30",
    title: {
      en: "Separate bot account and in-app guides",
      zh: "bot 独立账号与内置说明",
    },
    items: {
      en: [
        "The Tab Mode bot now has its own localStorage namespace, so it can stay logged in to a different account than the main client. Log in once inside the bot view and it persists across reloads.",
        "Tools now has Changelog and Usage Guide buttons at the top.",
        "Next up: attack player/team and send-ship commands.",
      ],
      zh: [
        "分屏 bot 现在使用独立的 localStorage 命名空间，可以长期保持与主客户端不同的账号。在 bot 画面登录一次，刷新后会保留。",
        "Tools 顶部新增更新日志和使用说明按钮。",
        "接下来：攻击玩家/队伍、发船指令。",
      ],
    },
  },
  {
    date: "2026-10-29",
    title: {
      en: "Hoard mode",
      zh: "攒兵模式",
    },
    items: {
      en: [
        "Hoard stops opening, infinite expansion and bot attack, and only accumulates troops.",
        "Press Hoard, click a teammate on the bot map, then press Donate. Below 130 density it donates once; at 130 or above it retries every 6 seconds.",
        "Stopping hoard restores the automation state saved when hoard started.",
      ],
      zh: [
        "攒兵会停止开图、无限扩张和 bot 自动攻击，只积累兵力。",
        "点 Hoard 后在地图上点队友，再点 Donate。密度低于 130 只捐一次；130 及以上每 6 秒重试。",
        "停止攒兵会恢复开启攒兵时保存的自动化状态。",
      ],
    },
  },
  {
    date: "2026-10-29",
    title: {
      en: "Tab Mode host and swap",
      zh: "分屏宿主与主/bot 切换",
    },
    items: {
      en: [
        "Tab Mode now uses a thin host page with the main client and bot as separate iframes.",
        "The Bot button opens the bot window; the switch button swaps main and bot without reloading either side.",
        "Clean view hides FX and game UI in the small window while the map keeps running.",
        "Bot rendering uses a lower device pixel ratio and the window is TulipBot-sized for better performance.",
      ],
      zh: [
        "分屏模式改为宿主页，主客户端和 bot 都是独立 iframe。",
        "Bot 按钮打开 bot 窗口；切换按钮交换主/bot，两边都不会重载。",
        "clean view 在小窗口隐藏 FX 和游戏 UI，地图继续运行。",
        "bot 使用更低的 devicePixelRatio，窗口大小也参考 TulipBot，性能更好。",
      ],
    },
  },
  {
    date: "2026-10-29",
    title: {
      en: "Lobby team split",
      zh: "大厅分队",
    },
    items: {
      en: [
        "In a standard team lobby, tap the current-game info area to open the team split window.",
        "Every team is listed with its ready players, and the panel refreshes automatically.",
      ],
      zh: [
        "标准团队大厅点击当前对局信息区域打开分队窗口。",
        "按队伍列出已准备玩家，面板会自动刷新。",
      ],
    },
  },
  {
    date: "2026-10-27",
    title: {
      en: "Ship routes and map labels",
      zh: "船只路线与地图标签",
    },
    items: {
      en: [
        "Ship routes with troop badges and team/player colors.",
        "Spawn point names, name size, team tags and clan spawn highlighting.",
      ],
      zh: [
        "船只路线、兵力徽章，以及队伍/玩家颜色。",
        "出生点名字、名字大小、队伍标签和氏族出生点高亮。",
      ],
    },
  },
  {
    date: "Earlier",
    title: {
      en: "Music player, opening presets and update checker",
      zh: "音乐播放器、开图预设与更新检查",
    },
    items: {
      en: [
        "Music player with bundled tracks, local files, cloud URLs, ID3 titles, volume and seek.",
        "Named opening presets that can be saved, loaded and deleted.",
        "FX update checker at the bottom of Settings.",
      ],
      zh: [
        "音乐播放器支持内置曲目、本地文件、云端 URL、ID3 标题、音量和进度。",
        "开图预设支持命名保存、加载和删除。",
        "设置底部提供 FX 更新检查。",
      ],
    },
  },
];

export const GUIDE = [
  {
    id: "start",
    title: { en: "First steps", zh: "开始使用" },
    html: {
      en: `
        <p>The site opens with the main client in the full view.</p>
        <ul>
          <li><strong>Tools</strong> (top-left) opens automation, opening presets, display, theme, bot settings and window size.</li>
          <li><strong>Bot</strong> opens Tab Mode and shows the bot client in a small floating window.</li>
          <li>The music button is below the Bot button. Drag any floating button to move it.</li>
          <li><kbd>F2</kbd> toggles Tools. <kbd>Esc</kbd> closes most panels.</li>
        </ul>
        <p class="fx-help-tip">Tip: the Bot window and Tools can both be open; the bot keeps running when its window is closed.</p>
      `,
      zh: `
        <p>打开网站后，主客户端会占据整个画面。</p>
        <ul>
          <li><strong>Tools</strong>（左上角）打开自动化、开图预设、显示、主题、bot 设置和窗口大小。</li>
          <li><strong>Bot</strong> 打开分屏模式，在小悬浮窗里显示 bot 客户端。</li>
          <li>音乐按钮在 Bot 按钮下面。悬浮按钮都可以拖动。</li>
          <li><kbd>F2</kbd> 开关 Tools，<kbd>Esc</kbd> 关闭大多数面板。</li>
        </ul>
        <p class="fx-help-tip">提示：Bot 窗口和 Tools 可以同时打开；关闭 Bot 窗口后 bot 仍会继续运行。</p>
      `,
    },
  },
  {
    id: "tabmode",
    title: { en: "Tab Mode and swap", zh: "分屏与主/bot 切换" },
    html: {
      en: `
        <p>Tab Mode runs the main client and the bot as two separate pages inside a host page, so switching never reloads either side.</p>
        <ol>
          <li>Press <strong>Bot</strong> to open the bot window. The bot is created on first open and then reused.</li>
          <li>Use the switch button in the window header to move the bot to the full view and the main client into the small window.</li>
          <li>Press it again to swap back. Matches, camera and automation keep their state.</li>
        </ol>
        <p>In the small window, clean view hides the UI so you see only the map. The floating window can be dragged and resized.</p>
        <p class="fx-help-tip">Tip: the first bot load can take a moment because it is a full game client.</p>
      `,
      zh: `
        <p>分屏模式把主客户端和 bot 作为宿主页里的两个独立页面运行，所以切换时两边都不会重载。</p>
        <ol>
          <li>点 <strong>Bot</strong> 打开 bot 窗口。bot 第一次打开时创建，之后复用。</li>
          <li>用窗口标题栏的切换按钮把 bot 放到主画面，主客户端进入小窗口。</li>
          <li>再按一次换回来。对局、视角和自动化状态都会保留。</li>
        </ol>
        <p>在小窗口里，clean view 会隐藏 UI，只留下地图。悬浮窗可以拖动和调整大小。</p>
        <p class="fx-help-tip">提示：bot 第一次加载需要一点时间，因为它是一个完整的游戏客户端。</p>
      `,
    },
  },
  {
    id: "account",
    title: { en: "Bot account", zh: "bot 账号" },
    html: {
      en: `
        <p>The bot has its own storage namespace, so it can use a different account from the main client.</p>
        <ol>
          <li>Open the bot window and log in from the bot's game menu <em>before</em> joining a match.</li>
          <li>Clean view only hides the UI during a match, so the main menu is still usable for login.</li>
          <li>The account is remembered across reloads and does not change the main account.</li>
        </ol>
        <p class="fx-help-tip">Tip: using different accounts also makes hoard's name-based main-player matching unambiguous.</p>
        <p>Cloudflare Turnstile is not bypassed. If the bot shows a verification widget, solve it in the bot view.</p>
      `,
      zh: `
        <p>bot 有独立的存储命名空间，所以可以使用和主客户端不同的账号。</p>
        <ol>
          <li>打开 bot 窗口，在进入对局<em>之前</em>从 bot 的游戏菜单登录。</li>
          <li>clean view 只在对局中隐藏 UI，主菜单仍然可以正常操作。</li>
          <li>账号会跨刷新保留，不会影响主账号。</li>
        </ol>
        <p class="fx-help-tip">提示：主号和 bot 使用不同账号，也能避免攒兵按名字找主号时出现重名歧义。</p>
        <p>Cloudflare Turnstile 没有绕过。bot 出现验证框时，在 bot 画面里手动完成验证。</p>
      `,
    },
  },
  {
    id: "automation",
    title: { en: "Bot automation", zh: "bot 自动化" },
    html: {
      en: `
        <p>The controls in the Tab Mode window target only the bot shown there.</p>
        <ul>
          <li><strong>All On / All Off</strong>: opening, infinite expansion and bot attack together.</li>
          <li><strong>Opening / Infinite</strong>: toggle each strategy.</li>
          <li><strong>Bot mode</strong>: Off, V20 Reserve, Land Max or Messiah.</li>
          <li><strong>Bot send</strong>: percentage of troops used per bot attack.</li>
          <li><strong>Bot rate</strong>: attacks per cycle.</li>
        </ul>
        <p>Tools → Bot settings exposes the same quick controls. Tools → Automation controls the main client.</p>
      `,
      zh: `
        <p>分屏窗口里的控制只作用于当前显示的 bot。</p>
        <ul>
          <li><strong>All On / All Off</strong>：同时开关开图、无限扩张和 bot 攻击。</li>
          <li><strong>Opening / Infinite</strong>：单独开关每种策略。</li>
          <li><strong>Bot mode</strong>：Off、V20 Reserve、Land Max 或 Messiah。</li>
          <li><strong>Bot send</strong>：每次 bot 攻击使用的兵力百分比。</li>
          <li><strong>Bot rate</strong>：每个周期的攻击次数。</li>
        </ul>
        <p>Tools → Bot settings 提供同样的快捷控制；Tools → Automation 控制主客户端。</p>
      `,
    },
  },
  {
    id: "hoard",
    title: { en: "Hoard", zh: "攒兵" },
    html: {
      en: `
        <p>Hoard makes the bot stop attacking and accumulate troops, then donate to your main player.</p>
        <ol>
          <li>Press <strong>Hoard</strong> in the Tab Mode window.</li>
          <li>Click a <strong>teammate</strong> on the bot map. A green <strong>Donate</strong> button appears.</li>
          <li>Press Donate to lock the target. Below 130 density it donates once; at 130 or above it donates 10% and retries every 6 seconds.</li>
        </ol>
        <p>Press <strong>Stop hoard</strong> to stop and restore the automation flags saved when hoard started.</p>
        <p class="fx-help-tip">Tip: if Donate does not appear, the clicked tile is not a same-team player or there is no transferable amount.</p>
      `,
      zh: `
        <p>攒兵会让 bot 停止攻击、积累兵力，然后捐给主玩家。</p>
        <ol>
          <li>在分屏窗口点 <strong>Hoard</strong>。</li>
          <li>在 bot 地图上点一个<strong>队友</strong>，会出现绿色 <strong>Donate</strong> 按钮。</li>
          <li>点 Donate 锁定目标。密度低于 130 只捐一次；130 及以上每次捐 10%，每 6 秒重试。</li>
        </ol>
        <p>点 <strong>Stop hoard</strong> 停止，并恢复开启攒兵时保存的自动化开关。</p>
        <p class="fx-help-tip">提示：如果 Donate 没出现，说明点到的地方不是同队玩家，或者没有可捐的兵力。</p>
      `,
    },
  },
  {
    id: "display",
    title: { en: "Display and opening presets", zh: "显示与开图预设" },
    html: {
      en: `
        <ul>
          <li>Spawn point names, name size, team tags and clan spawn highlighting.</li>
          <li>Ship routes, duplicate IP highlighting, density display style and tick number.</li>
          <li>Opening presets: open Tools → Opening, edit the strategy, then save or load a named preset.</li>
          <li>Theme: pastel UI tint; the map keeps its own colors.</li>
        </ul>
      `,
      zh: `
        <ul>
          <li>出生点名字、名字大小、队伍标签和氏族出生点高亮。</li>
          <li>船只路线、重复 IP 高亮、密度显示方式和 tick 数字。</li>
          <li>开图预设：Tools → Opening，编辑策略后保存或加载命名预设。</li>
          <li>主题：柔和 UI 色调，地图本身颜色不变。</li>
        </ul>
      `,
    },
  },
  {
    id: "music",
    title: { en: "Music", zh: "音乐" },
    html: {
      en: `
        <p>The music button sits below the Bot button. The panel supports play/pause, previous/next, repeat, shuffle, volume and seek.</p>
        <ul>
          <li>Two bundled tracks cannot be removed.</li>
          <li>Add local files with the file picker; they persist in IndexedDB.</li>
          <li>Add cloud URLs; the playlist is saved in localStorage.</li>
        </ul>
        <p class="fx-help-tip">Tip: browsers may require one tap before audio can start; the host forwards interactions from the game iframes.</p>
      `,
      zh: `
        <p>音乐按钮在 Bot 按钮下方。面板支持播放/暂停、上一首/下一首、循环、随机、音量和进度。</p>
        <ul>
          <li>两首内置曲目不能删除。</li>
          <li>可以用文件选择器添加本地音乐，保存在 IndexedDB。</li>
          <li>可以添加云端 URL，播放列表保存在 localStorage。</li>
        </ul>
        <p class="fx-help-tip">提示：浏览器可能要求先点一下页面才能播放；宿主页会把游戏 iframe 里的交互转发给音乐播放器。</p>
      `,
    },
  },
  {
    id: "troubleshooting",
    title: { en: "Updates and troubleshooting", zh: "更新与排错" },
    html: {
      en: `
        <ul>
          <li>The host page owns the service worker and the update prompt. If the UI looks stale, reload twice or clear site data for the page.</li>
          <li>If the bot window feels heavy, close it (the bot keeps running), use clean view, or make the window smaller.</li>
          <li>The bot renders at a lower device pixel ratio while in clean view to save performance.</li>
          <li>The build pins a verified game script. Do not run <code>npm run build</code> unless you are updating game compatibility.</li>
        </ul>
      `,
      zh: `
        <ul>
          <li>Service worker 和更新提示由宿主页负责。如果界面像旧版本，刷新两次或清除该站点的数据。</li>
          <li>如果 bot 窗口卡，可以关掉窗口（bot 仍会运行）、使用 clean view，或把窗口调小。</li>
          <li>clean view 下 bot 使用更低的 devicePixelRatio 以减少卡顿。</li>
          <li>构建固定了验证过的游戏脚本。除非要更新游戏兼容性，不要运行 <code>npm run build</code>。</li>
        </ul>
      `,
    },
  },
];
