export const CHANGELOG = [
  {
    "date": "2026-10-30",
    "title": "Territorial.io 2.16.66 compatibility",
    "items": [
      "Updated the pinned game script to the October 30 build.",
      "Re-derived the automation hooks, lobby labels and ship-route hook.",
      "Build passes; live-game smoke test still pending for automation, lobby split, ship routes, custom lobby and map commands."
    ]
  },
  {
    "date": "2026-10-30",
    "title": "Attack Player and Boat",
    "items": [
      "Attack Player: press it, click an enemy on the bot map, then press the red Attack button. Default is 9%; below 100 density it attacks once, at 100 or above it retries every 6 seconds.",
      "Boat: press it, then click a target on the bot map. It uses the game's built-in launch-ship action at 4%.",
      "Attack team was skipped for now."
    ]
  },
  {
    "date": "2026-10-30",
    "title": "Separate bot account and in-app guides",
    "items": [
      "The Tab Mode bot now has its own localStorage namespace, so it can stay logged in to a different account than the main client. Log in once inside the bot view and it persists across reloads.",
      "Tools now has Changelog and Usage Guide buttons at the top.",
      "Followed by map-based Attack Player and Boat commands."
    ]
  },
  {
    "date": "2026-10-29",
    "title": "Hoard mode",
    "items": [
      "Hoard stops opening, infinite expansion and bot attack, and only accumulates troops.",
      "Press Hoard, click a teammate on the bot map, then press Donate. Below 130 density it donates once; at 130 or above it retries every 6 seconds.",
      "Stopping hoard restores the automation state saved when hoard started."
    ]
  },
  {
    "date": "2026-10-29",
    "title": "Tab Mode host and swap",
    "items": [
      "Tab Mode now uses a thin host page with the main client and bot as separate iframes.",
      "The Bot button opens the bot window; the switch button swaps main and bot without reloading either side.",
      "Clean view hides FX and game UI in the small window while the map keeps running.",
      "Bot rendering uses a lower device pixel ratio and the window is TulipBot-sized for better performance."
    ]
  },
  {
    "date": "2026-10-29",
    "title": "Lobby team split",
    "items": [
      "In a standard team lobby, tap the current-game info area to open the team split window.",
      "Every team is listed with its ready players, and the panel refreshes automatically."
    ]
  },
  {
    "date": "2026-10-27",
    "title": "Ship routes and map labels",
    "items": [
      "Ship routes with troop badges and team/player colors.",
      "Spawn point names, name size, team tags and clan spawn highlighting."
    ]
  },
  {
    "date": "Earlier",
    "title": "Music player, opening presets and update checker",
    "items": [
      "Music player with bundled tracks, local files, cloud URLs, ID3 titles, volume and seek.",
      "Named opening presets that can be saved, loaded and deleted.",
      "FX update checker at the bottom of Settings."
    ]
  }
];

export const GUIDE = [
  {
    "id": "start",
    "title": "First steps",
    "html": "\n        <p>The site opens with the main client in the full view.</p>\n        <ul>\n          <li><strong>Tools</strong> (top-left) opens automation, opening presets, display, theme, bot settings and window size.</li>\n          <li><strong>Bot</strong> opens Tab Mode and shows the bot client in a small floating window.</li>\n          <li>The music button is below the Bot button. Drag any floating button to move it.</li>\n          <li><kbd>F2</kbd> toggles Tools. <kbd>Esc</kbd> closes most panels.</li>\n        </ul>\n        <p class=\"fx-help-tip\">Tip: the Bot window and Tools can both be open; the bot keeps running when its window is closed.</p>\n      "
  },
  {
    "id": "tabmode",
    "title": "Tab Mode and swap",
    "html": "\n        <p>Tab Mode runs the main client and the bot as two separate pages inside a host page, so switching never reloads either side.</p>\n        <ol>\n          <li>Press <strong>Bot</strong> to open the bot window. The bot is created on first open and then reused.</li>\n          <li>Use the switch button in the window header to move the bot to the full view and the main client into the small window.</li>\n          <li>Press it again to swap back. Matches, camera and automation keep their state.</li>\n        </ol>\n        <p>In the small window, clean view hides the UI so you see only the map. The floating window can be dragged and resized.</p>\n        <p class=\"fx-help-tip\">Tip: the first bot load can take a moment because it is a full game client.</p>\n      "
  },
  {
    "id": "account",
    "title": "Bot account",
    "html": "\n        <p>The bot has its own storage namespace, so it can use a different account from the main client.</p>\n        <ol>\n          <li>Open the bot window and log in from the bot's game menu <em>before</em> joining a match.</li>\n          <li>Clean view only hides the UI during a match, so the main menu is still usable for login.</li>\n          <li>The account is remembered across reloads and does not change the main account.</li>\n        </ol>\n        <p class=\"fx-help-tip\">Tip: using different accounts also makes hoard's name-based main-player matching unambiguous.</p>\n        <p>Cloudflare Turnstile is not bypassed. If the bot shows a verification widget, solve it in the bot view.</p>\n      "
  },
  {
    "id": "automation",
    "title": "Bot automation",
    "html": "\n        <p>The controls in the Tab Mode window target only the bot shown there.</p>\n        <ul>\n          <li><strong>All On / All Off</strong>: opening, infinite expansion and bot attack together.</li>\n          <li><strong>Opening / Infinite</strong>: toggle each strategy.</li>\n          <li><strong>Bot mode</strong>: Off, V20 Reserve, Land Max or Messiah.</li>\n          <li><strong>Bot send</strong>: percentage of troops used per bot attack.</li>\n          <li><strong>Bot rate</strong>: attacks per cycle.</li>\n        </ul>\n        <p>Tools → Bot settings exposes the same quick controls. Tools → Automation controls the main client.</p>\n      "
  },
  {
    "id": "hoard",
    "title": "Hoard",
    "html": "\n        <p>Hoard makes the bot stop attacking and accumulate troops, then donate to your main player.</p>\n        <ol>\n          <li>Press <strong>Hoard</strong> in the Tab Mode window.</li>\n          <li>Click a <strong>teammate</strong> on the bot map. A green <strong>Donate</strong> button appears.</li>\n          <li>Press Donate to lock the target. Below 130 density it donates once; at 130 or above it donates 10% and retries every 6 seconds.</li>\n        </ol>\n        <p>Press <strong>Stop hoard</strong> to stop and restore the automation flags saved when hoard started.</p>\n        <p class=\"fx-help-tip\">Tip: if Donate does not appear, the clicked tile is not a same-team player or there is no transferable amount.</p>\n      "
  },
  {
    "id": "attackboat",
    "title": "Attack Player and Boat",
    "html": "\n        <p>These commands also use map selection in the Tab Mode window.</p>\n        <ul>\n          <li><strong>Attack Player</strong>: press it, click an enemy on the bot map, then press the red <strong>Attack</strong> button. Default is 9%. Below 100 density it attacks once; at 100 or above it attacks immediately and retries every 6 seconds.</li>\n          <li><strong>Boat</strong>: press it, then click a target on the bot map. The game's built-in launch-ship action is used at 4%.</li>\n        </ul>\n        <p>Attack and hoard are mutually exclusive. Boat is one-shot and does not change automation.</p>\n      "
  },
  {
    "id": "display",
    "title": "Display and opening presets",
    "html": "\n        <ul>\n          <li>Spawn point names, name size, team tags and clan spawn highlighting.</li>\n          <li>Ship routes, duplicate IP highlighting, density display style and tick number.</li>\n          <li>Opening presets: open Tools → Opening, edit the strategy, then save or load a named preset.</li>\n          <li>Theme: pastel UI tint; the map keeps its own colors.</li>\n        </ul>\n      "
  },
  {
    "id": "music",
    "title": "Music",
    "html": "\n        <p>The music button sits below the Bot button. The panel supports play/pause, previous/next, repeat, shuffle, volume and seek.</p>\n        <ul>\n          <li>Two bundled tracks cannot be removed.</li>\n          <li>Add local files with the file picker; they persist in IndexedDB.</li>\n          <li>Add cloud URLs; the playlist is saved in localStorage.</li>\n        </ul>\n        <p class=\"fx-help-tip\">Tip: browsers may require one tap before audio can start; the host forwards interactions from the game iframes.</p>\n      "
  },
  {
    "id": "troubleshooting",
    "title": "Updates and troubleshooting",
    "html": "\n        <ul>\n          <li>The host page owns the service worker and the update prompt. If the UI looks stale, reload twice or clear site data for the page.</li>\n          <li>If the bot window feels heavy, close it (the bot keeps running), use clean view, or make the window smaller.</li>\n          <li>The bot renders at a lower device pixel ratio while in clean view to save performance.</li>\n          <li>The build pins a verified game script. Do not run <code>npm run build</code> unless you are updating game compatibility.</li>\n        </ul>\n      "
  }
];
