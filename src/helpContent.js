export const CHANGELOG = [
  {
    "date": "2026-11-02",
    "title": "Improved a few features",
    "items": [
      "Updated for Territorial.io 2.16.67.",
      "Improved a few features."
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
    "id": "chat",
    "title": "Lobby chat",
    "html": "\n        <p>The lobby chat input has a <strong>Unicode</strong> button next to Send. It converts the English letters, digits and punctuation in the box to fullwidth Unicode characters, then you press Send as usual.</p>\n        <p class=\"fx-help-tip\">The conversion is local; it only changes the text in the chat input. Emoji and non-ASCII text are left unchanged.</p>\n      "
  },
  {
    "id": "shipping",
    "title": "Shipping",
    "html": "\n        <p>Tools → Shipping controls the ship tools.</p>\n        <ul>\n          <li><strong>Ship routes</strong>: draw route lines and troop badges.</li>\n          <li><strong>Ship progress</strong>: show a percentage next to each ship (independent of routes).</li>\n          <li><strong>Ship panel</strong>: show the panel under the left leaderboard.</li>\n          <li><strong>Auto recall blocked</strong>: recall my ship when a stronger enemy is ahead.</li>\n          <li><strong>Auto intercept</strong>: fire at eligible attackers automatically; the panel Auto checkbox is the same setting.</li>\n        </ul>\n        <p>The panel lists my ships with troops/progress and their attackers. Attacker names are red below 10% of my total troops, purple otherwise. The shield button on an attacker row queues an intercept.</p>\n        <p class=\"fx-help-tip\">Interception waits until the enemy is in the last 10% of its route and sends 105% of its troops; if my total troops are not enough it is skipped. The red X appears on my ship when a stronger enemy is on the path ahead.</p>\n      "
  },
  {
    "id": "troubleshooting",
    "title": "Updates and troubleshooting",
    "html": "\n        <ul>\n          <li>The host page owns the service worker and the update prompt. If the UI looks stale, reload twice or clear site data for the page.</li>\n          <li>If the bot window feels heavy, close it (the bot keeps running), use clean view, or make the window smaller.</li>\n          <li>The bot renders at a lower device pixel ratio while in clean view to save performance.</li>\n          <li>The build pins a verified game script. Do not run <code>npm run build</code> unless you are updating game compatibility.</li>\n        </ul>\n      "
  }
];
