# GoodClient / TulipBot Handoff

Last updated: 2026-10-29

## Local preview

Server is running from Termux home on port 8001:

- Client: http://localhost:8001/goodclient_v2/build/
- TulipBot: http://localhost:8001/tulipbot/

## Current state

- GoodClient base: FX Client 0.6.30 + Omen automation + hostname spoof.
- Automation defaults on; multiplayer works.
- Spawn point names, name-size slider, team tags (map troop labels + player list + spawn labels).
- Team-mode automation targeting was patched (team-aware canAttack + target range includes enemy players); needs real team-mode testing.
- Theme: cream/pale green; DOM UI themed; whole-screen tint. Menu background is a plain cream gradient (line dog removed).
- Chinese UI: `src/i18n.js` auto-detects Chinese and translates FX windows (settings, toolbox, automation, custom lobby, player list). Switch with Settings -> Interface language or `?lang=zh`. The game's own UI language is set in the game's Options -> Language (choose Chinese).
- Music player: `src/musicPlayer.js` + `assets/music/` (two bundled t+pazolite tracks). Floating music icon (draggable, spins while playing), panel with play/pause/prev/next/repeat/shuffle, local file picker (IndexedDB persistence), cloud URL playlist (localStorage), volume and seek. Built-in tracks cannot be removed.
- Turnstile: not bypassed. Keep manual verification; only smoother retry/status handling is acceptable.
- Ship routes: implemented locally. Tools -> Display -> Ship routes (default on).
  - Status shows `ships N · paths M · routes K`.
  - Route colors use team/player color; fixed-size troop badges added on the route/ship.
  - The `ix.zt` binding bug (`this.a3h is not a function`) is fixed.
- TulipBot: single page with main game iframe + small floating bot iframe.
  - Auto-follows FX custom lobbies by reading the main custom-lobby code (DOM/hash) and opening `#lobby=<code>` in the bot.
  - Manual lobby-code input + Join bot.
  - Panel controls automation; Auto All On when bot enters a game.
  - Only works with FX custom lobbies; normal public lobbies cannot be mirrored.
- Lobby team split (2026-10-29): target is the standard territorial.io multiplayer lobby (the screen with `Team / BR / 1v1 / Zombie` tabs and `Chat / Players`), NOT the FX custom-lobby window. In a team lobby, click the current-game info area under the mode tabs (left side, e.g. `Africa 5 Teams`) to open/close the team split window.
  - Shows every team in order: `Team 1: ...`, `Team 2: ...` up to the lobby's team count, including empty teams. Each row has the team color dot and all ready players assigned to that team.
  - Uses only ready players, and only for team modes (`kc < 7`, 2-8 teams). Refreshes every 500 ms while open; closes automatically when leaving team mode/lobby.
  - Display now uses the existing `WindowManager` window named `lobbyTeams` (same proven window system as Tools/Settings), so it no longer depends on the custom floating panel/CSS. It is marked `closable: false`, so outside clicks/`Escape` do not close it; click the info area again to hide it. The window is sized down to `min(360px, 90vw)`, `max-height: 55vh`, font 14px.
  - The window is draggable by its `Team split` title bar (pointer + touch), clamped to the viewport. The game patch ignores clicks whose target is inside `[data-window-name="lobbyTeams"]`, so dragging the window cannot toggle it.
  - Reproduces the game's TeamManager assignment: nearest team color, clan grouping, second-choice fill. Validated against the game's own function with 200 random cases (0 differences).
  - The game patch uses document-level capture listeners for `pointerdown`, `click` and `touchend`, hit-tests the current-game info button's bounding rect, then calls `__fx.lobbyTeams.toggle()`. Clicks on the right/next-game info are ignored.
  - Client toggle is debounced (250ms) to avoid double toggles from pointerdown+click or duplicate listeners. If lobby data is missing, the window shows `No lobby data` for 4s before closing.
  - The info button shows `▾` when the client API is ready, or `!` if `__fx.lobbyTeams.toggle` is missing (usually a stale/mixed client bundle).
  - Host API: `window.__fx.lobbyTeamsHost.getState()` in `patches/lobbyTeams.js`; client API: `__fx.lobbyTeams.toggle()` / `setAnchor()` in `src/lobbyTeams.js`.
  - Built with `npm run build-only` / `build-client`; real lobby UI still needs manual verification.
- Next major task: **Tab Mode**. Revised plan is in `TAB_MODE_SPEC.md` section 11 (2026-10-29): first a floating Tab Mode button/window showing the bot's normal game UI and moving bot settings into Tools; second hide the bot's in-game UI; third implement attack/hoard/send-ships commands.
- Tab Mode Phase 1 (2026-10-29, implemented, needs browser test):
  - Target is **GoodClient only**; TulipBot is for mass botting and is shelved for this work (do not wire Tab Mode through `~/tulipbot`).
  - Architecture: the GoodClient page owns a single bot iframe. The floating window hosts that iframe directly, so no cross-page `postMessage` is needed.
  - `src/tabMode.js` creates a draggable `Tab` toggle (`#fxTabModeToggle`) and a floating panel (`#fxTabMode`) with a header, status line, reload button and iframe (`#fxTabModeFrame`).
  - The bot iframe is lazy-created on first open, uses the same client URL with `?tabbot=1` (existing query params/hash preserved), and is only hidden/shown afterwards, so toggling does not reload it.
  - The bot instance skips Tab Mode initialization (no recursive Tab Mode) but keeps its normal UI; clean/no-UI view is Phase 2.
  - `Tools → Bot settings` (`src/toolbox.js`) targets only the bot shown in Tab Mode: status, Open Tab Mode, Reload bot, All On/Off, Opening, Infinite, bot mode. The section is hidden inside a `?tabbot=1` instance.
  - Tab Mode strings are in `src/i18n.js` with ZH translations; `#fxTabMode` / `#fxTabModeToggle` are in the i18n roots.
  - CSS was appended to `static/main.css`; built with `npm run build-client` (Exit OK, only webpack size warnings).
  - 2026-10-29 fix: the game's DOM cleanup (`aI2.b` in `build/game.js`) removes direct `DIV`/`INPUT`/`BUTTON` children of `document.body`. Tab Mode's button/panel were direct body children, got detached, and `open()` acted on detached nodes while Tools (which re-attaches every 500 ms) disappeared. Tab Mode UI now mounts inside `#windowContainer` (a `SPAN`, never cleaned) and `ensureAttached()` runs every 1.5 s.
  - UI change per user: the start button is now a standalone Tools-style floating `Bot` button (top-left, below Tools/Music) that opens/closes its own panel. The `Open Tab Mode` button was removed from Tools; `Tools → Bot settings` keeps status, Reload, and automation controls and points at the Bot button.
  - Also fixed earlier overlap: `open()` closes Tools and the music panel first; their panel z-index is `2147483646` so Tab Mode stays on top.
  - 2026-10-29 perf/size pass: the panel is now TulipBot-sized but slightly larger (`width: min(38vw, 460px)`, `height: min(38vh, 340px)`, min 260x190) instead of 760x560.
  - 2026-10-29 perf: the `?tabbot=1` instance caps `window.devicePixelRatio` at 1 (the game only reads it for canvas scale), and skips music, theme, ship routes, toolbox and the in-game automation panel plus the i18n DOM observer. Automation, settings, custom lobby, lobby teams and game rendering stay enabled. The iframe is still lazy-created and hidden (not unloaded) when the panel closes.
  - Phase 2 (clean view, 2026-10-29): `?tabbot=1` now forces the game's built-in UI-hidden mode by polling `window.c.gG` and calling `window.nr.nE(true)` (`initBotCleanView` in `src/tabMode.js`). These are top-level `var`s from the pinned `game.js`; with UI hidden the game draws only the map (and a small bar). Note: `c.gG === true` short-circuits the game's native click handler, so Phase 3 send-ships must translate clicks to game coordinates itself instead of relying on native map clicks.
  - Remaining: manual test of the new size/perf + clean view (Bot panel should be ~min(38vw,460px) x min(38vh,340px), and the bot should show a clean map with no game HUD). Then Phase 3 command layer (attack player/team, hoard, send ships).
- Remote GitHub `goodclient_v2` is up to date as of 2026-10-29, including the lobby team split panel and Tab Mode Phase 1 (`b691a7f feat: add Tab Mode bot shell with Tools bot settings`); the Pages Actions deploy succeeded. HTTPS push is unreliable on this network (SSL EOF / connect failures). The working fallback is the SSH remote: `git push git@github.com:cilIndya-kkkkk/goodclient_v2.git goodclient_v2` (`gh` is authenticated as `cilIndya-kkkkk`, git protocol is SSH). The older workaround was a forced-IP Node HTTPS request (no account password).

## Known issues / next steps

1. Test the lobby team split window in a real standard team lobby (click current-game info area, open/close, ready-state changes, 2-8 team modes).
   - 2026-10-29: the old custom fixed panel never appeared for the tester (e-ink screen), even though a `FX HIT` text badge proved the info-area tap was detected and the client API was ready. Switched display to the existing `WindowManager` window, which is already proven by Tools/Settings. `FX HIT` debug badge removed. Pending real test.
2. Test the new ship troop badges; if labels overlap or positions are off, tune `src/shipRoutes.js`.
3. Team color mapping currently swaps Black/White; other team colors may still be mismatched. Need real team-mode check.
4. Team-mode bot v20/Land Max needs a real multiplayer team test.
5. TulipBot custom-lobby auto-follow needs a real test (custom lobby worker reachable; same-origin storage/accounts).
6. Multiple bots/TulipBots: parent page can spawn multiple bot iframes, but each full client is heavy and needs an isolated session/origin.
7. AI: best next step is telemetry + parameter search over the existing rule-based automation, then replay/imitation learning; avoid end-to-end RL on mobile.
8. `TAB_MODE_SPEC.md` is still untracked in git. Decide whether to commit it.
9. Tab Mode Phase 1 needs a real browser test: standalone `Bot` button drag/click, panel open/close without bot iframe reload, bot client inside `?tabbot=1`, Tools → Bot settings reading/changing that bot. First test reported "Tools disappears but no bot UI"; root cause was the game's body cleanup detaching the Tab UI. Retest with the new build. Then implement Phase 2 clean view.
10. Tab Mode bot and main share the same origin/localStorage (`fx_settings`), so their persisted automation settings overwrite each other on reload. In-memory they are independent while both are loaded. If independent bot settings are needed, namespace the settings key for `?tabbot=1` (not done yet).

## Key files

- `patches/lobbyTeams.js` - exposes lobby mode, ready players and the current-game info button to the client.
- `src/lobbyTeams.js` - lobby team assignment + draggable WindowManager window.
- `src/windowManager.js` - existing window system used by Tools/Settings/lobby team split.
- `src/tabMode.js` - Tab Mode toggle/panel and the single bot iframe (`?tabbot=1`); Phase 1 shell.
- `src/toolbox.js` - Tools panel; now includes `Tools → Bot settings` for the Tab Mode bot.
- `~/tulipbot/bot.js` - mass-botting controller; currently shelved for Tab Mode work.
- `TAB_MODE_SPEC.md` - Tab Mode plan; read section 11 first.
- `patches/gc_shipRoutes.js` - hooks ship draw and passes ship/path data.
- `src/shipRoutes.js` - route drawing, colors, troop badges, route status.
- `src/toolbox.js` - Tools UI, settings toggles, status.
- `src/theme.js` - theme/tint.
- `src/i18n.js` - Chinese/English UI dictionary and DOM translation.
- `src/musicPlayer.js` - floating music player (bundled tracks, local files, cloud URLs).
- `assets/music/` - bundled MP3s copied into the build.
- `patches/gc_openingAutomation.js` - Omen automation + team-mode targeting.
- `patches/nameRendering.js` - map troop labels + team tags.
- `patches/highlightSpawnpoints.js` - spawn names/team tags.
- `~/tulipbot/` - single-page main+bot controller and README.

## If starting a new conversation

Ask the assistant to read:

```
~/goodclient_v2/HANDOFF.md
~/goodclient_v2/TAB_MODE_SPEC.md
~/goodclient_v2/README_DEV.md
~/tulipbot/README.md
```

Then continue from Tab Mode Phase 3 (command layer: attack player/team, hoard, send ships), after manually testing the Phase 1/2 shell + clean view. Remaining earlier tests: lobby team split manual check / ship troop badges / team mode / TulipBot custom lobby.
