# GoodClient / TulipBot Handoff

Last updated: 2026-10-31

## Local preview

Server is running from Termux home on port 8002:

- Client: http://localhost:8002/goodclient_v2/build/
- TulipBot: http://localhost:8002/tulipbot/

## Game update 2026-10-30 (Territorial.io 2.16.66)

- `game/latest.js` was replaced with the 2026-10-30 script; a local backup of the 2026-10-28 script is at `game/latest_prev.js` (not committed).
- Automation `g` table re-derived for the new build (35 names). `__fx.gameUi` is exposed for cleanView (hide/show + spawn-selection detection) so the client no longer depends on the old `c`/`nr` globals. Hostname spoof now replaces every `this.hostname.indexOf(...)` assignment, so it is version-independent.
- `patches/customLobby.js` socket-close hook updated to the new `m5(bb,b7)` function.
- `patches/lobbyTeams.js` lobby field names updated: `aI.b1.a30`, `aI.b1.jH`, `aI.aU.aV`, `aI.aU.jQ`, player `ah`/`aXn`, mode `jK`, info row `aBk.nw`/`nx`.
- `patches/gc_shipRoutes.js` re-derived for the new ship draw function and projects route points through the game's new camera formula.
- `npm run build-only` passes. A live-game smoke test is still required, especially for automation, lobby team split, ship routes, custom lobby and map commands.
- 2026-10-31 reported in-match bug: an undefined function appears, the main client loses all UI (map only, no text), and swap stops working. Mitigations added: `cleanView` guards missing game globals, and falls back to forcing `ct.ur` + `hE.resize()` + a resize event; the host wraps clean-state calls in try/catch with retry; the automation tick hook and ship-route draw call are wrapped in try/catch and log the first error (`window.__fxTickError` / `window.__fxShipError`). The exact console error is still needed to fix the root cause.

## Current state

- GoodClient base: FX Client 0.6.34 + Omen automation + hostname spoof; pinned game is Territorial.io 2.16.66 (2026-10-30).
- Automation defaults on; multiplayer works.
- Spawn point names, name-size slider, team tags (map troop labels + player list + spawn labels).
- Team-mode automation targeting was patched (team-aware canAttack + target range includes enemy players); needs real team-mode testing.
- Theme: cream/pale green; DOM UI themed; whole-screen tint. Menu background is a plain cream gradient (line dog removed).
- UI language: **English-only**. The Chinese dictionary/DOM translator and the Interface language setting were removed. `src/i18n.js` now exposes an identity `t()` for compatibility. The game's own UI language is still set in the game's Options -> Language.
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
- Tab Mode host refactor (2026-10-29, implemented, needs browser test):
  - Scope is **GoodClient only**; TulipBot is shelved. The normal `index.html` URL is now a thin host page.
  - Pages: `index.html` = host (service worker + update prompt + `host.bundle.js`); `client.html` = main client iframe; `bot.html` = minimal bot iframe. Only `index.html` registers the SW / shows the update prompt.
  - `src/host/main.js` owns the main/bot iframes, music player and `window.__fxHost`; `src/host/tabMode.js` owns the Bot button, window chrome, layout, swap, persistence and status.
  - `#fxMainFrame` and `#fxBotFrame` are direct `body` children, fixed-position, created once, never reparented. Swap only changes `left/top/width/height/z-index` and cleanView state; no `src` change, no reload.
  - Bot iframe is lazy-created on first open: `bot.html?bot=1&v=<stamp>`. Closing does not unload it: it uses `opacity:0` + `pointer-events:none` + `inert` and keeps its last slot size, so automation/game ticks can continue (not `display:none`).
  - Closing while swapped swaps back first; the main client is never hidden. Opening the window defaults to bot-in-window/main-full.
  - Swap calls `__fx.cleanView.setEnabled` on both clients and focuses the now-fullscreen frame. Main default clean=false, bot default clean=true.
  - `src/cleanView.js`: forces the game UI hidden via `window.c.gG` + `window.nr.nE(true)` polling, **except during spawn selection (`c.ao === true`), where the game UI is shown so spawn buttons remain usable**. Adds `body.fx-clean` to hide FX UI, and installs a dynamic `devicePixelRatio` getter (1 while clean+lowDpr, real otherwise) followed by a `resize` event.
  - `src/instance.js`: central `isBotInstance()` / `getHost()` / `isEmbedded()`. Settings isolation: bot uses `fx_settings_bot` (first run copies `fx_settings`); hostfix key and toolbox positions are per-instance (`_bot`); `fx_ui_language` stays shared.
  - Tools variants: main embedded = full Tools + Bot settings + width/height sliders; bot = Automation-only Tools (no settings/opening presets/display/theme/status/music/FX Settings); direct `client.html` = full Tools without Bot settings. Music only runs in the host; embedded main and bot skip it, and host forwards iframe gestures to the music autoplay handler.
  - Tools help (2026-10-30): full Tools starts with `Changelog` / `Usage Guide` buttons (hidden in the bot variant). `src/helpPanels.js` renders a draggable panel inside `#windowContainer`; `src/helpContent.js` holds English-only content. Changelog is newest-first; the guide has TOC chips and collapsible sections. i18n keys: `Changelog`, `Usage Guide`, `GoodClient Help`; CSS is under the `Tools top actions and help panel` block in `static/main.css`.
  - Embedded fixes: update-checker `forceReload` and fullscreen go through `__fxHost`; custom-lobby "Copy link" uses `__fxHost.getTopUrl()`; Tools music button opens host music.
  - Build: webpack entries `fxClient -> fx.bundle.js` and `host -> host.bundle.js`; dynamic chunks use content hashes; `index.html`/`client.html`/`bot.html` are stamped with `buildTimestamp`; `build-only` passes.
  - Local commits so far: `0ed8b7b`, `99327a2`, `8f7a788`, `d545eb7`, `37f4a3b`, plus `b3b026f` (final stage 6) and `d29ae32` (status i18n).
  - Pushed through `87faf9b` (hoard selection docs); manual test checklist is in `TAB_MODE_HOST_PROMPT.md` §6 / the final report.
  - 2026-10-29 bot account isolation: `static/bot.html` installs a `fxbot::`-prefixed `localStorage` view before any game/FX script. The bot keeps its own account (the game stores credentials as `v…`/`d…` localStorage keys) and its own FX settings, independent of the main client, in the same origin. Log in once inside the bot (the main menu is still visible; clean view only applies in-game) and it persists across reloads. This also makes hoard’s name-based main-player matching unambiguous. Caveat: if a browser refuses the `localStorage` override, isolation silently falls back to shared storage; the fallback is a separate origin.
- Hoard (2026-10-29, first pass): `patches/gc_openingAutomation.js` now exposes `__fx.openingAutomation.sendSupport(target, percent)` using the game's own `GameCommandSender.sendSupport` (g table now 35 names; same-team enforced via `TeamUtils.canAttack`, no forged packets). `src/botCommander.js` adds `__fx.botCommander`: `startSelection` / `cancelSelection` / `confirmSelection` / `stopHoard` / `getState`, plus `__fx.botMap.playerAt(clientX, clientY)`. Hoard is now map-selected: press `Hoard` in the Tab Mode window, click a teammate on the bot map, then click the green `Donate` button that appears. The main player is stored by raw name. Hoard disables opening/infinite/bot-attack and restores the previous flags/mode when stopped. If density is below 130 on confirm it performs one donation only (10% or the maximum transferable); if density is >=130 it performs the initial donation and then retries every 6s while density is >=130. The host Tab Mode window has All On/Off, Opening, Infinite, bot mode, `Bot send`/`Bot rate` sliders, `Hoard`, and a density/target status; Tools keeps only the automation/size controls.
  - Main-player choice is stored by raw player name (`fx_hoard_main_player_name`) and resolved again each tick, so it survives a new game. Support requires main and bot on the same team. The map click uses `__fx.botMap.playerAt` and `canSupport`/`getMaxSupportPercent`; the green button only appears for a valid teammate.
  - 2026-10-29: user confirmed the map-based hoard selection flow works. Still to confirm in a real donation: 130 absolute vs percentage, and whether the 6s retry should continue only while density stays >=130 (current implementation). The green donate button is map-based; there is no main-player dropdown anymore.
- Attack Player (2026-10-30, first pass): the host Tab Mode window has `Attack Player`. Press it, click an enemy on the bot map, then press the red `Attack` button. `__fx.openingAutomation.canAttackTarget` / `attackPlayerTarget` use the game's own `GameCommandSender.sendAttack` (no forged packets). Default is 9% (`0.09`). If density at confirmation is `<100`, it attacks once; if `>=100`, it attacks immediately and then retries every 6s while density stays `>=100`. It disables automation and restores the saved state when stopped; stopping also cancels the current attack target.
  - Same map-selection UI as hoard: selecting one command cancels the other selection; active hoard/attack modes are mutually exclusive.
  - Still to confirm: whether the `<100 single / >=100 loop` rule and 6s cadence are what the user wants for attack, and whether stopping should cancel the outgoing attack (current behavior).
- Boat command (2026-10-30, first pass): the host Tab Mode window has `Boat`. Press it, then click a target on the bot map; it calls the game's own ship-launch action (`MouseActions.runMouseAction(1)` / `a1C(1)`) through `__fx.botMap.launchShipAt`, not a forged packet. Default is 4%; the helper temporarily sets the attack slider to 4% and restores the previous value. It is one-shot (no 6s loop) and does not disable automation. The built-in ship logic validates the water target/path.
- Remote GitHub `goodclient_v2` was last pushed at `11bb45c` (before the 2026-10-30 game update); the local branch is ahead. HTTPS push is unreliable on this network (SSL EOF / connect failures). When the user asks to deploy, use the SSH remote: `git push git@github.com:cilIndya-kkkkk/goodclient_v2.git goodclient_v2` (`gh` is authenticated as `cilIndya-kkkkk`, git protocol is SSH). The older workaround was a forced-IP Node HTTPS request (no account password).

## Known issues / next steps

1. Test the lobby team split window in a real standard team lobby (click current-game info area, open/close, ready-state changes, 2-8 team modes).
   - 2026-10-29: the old custom fixed panel never appeared for the tester (e-ink screen), even though a `FX HIT` text badge proved the info-area tap was detected and the client API was ready. Switched display to the existing `WindowManager` window, which is already proven by Tools/Settings. `FX HIT` debug badge removed. Pending real test.
2. Test the new ship troop badges; if labels overlap or positions are off, tune `src/shipRoutes.js`.
3. Team color mapping currently swaps Black/White; other team colors may still be mismatched. Need real team-mode check.
4. Team-mode bot v20/Land Max needs a real multiplayer team test.
5. TulipBot custom-lobby auto-follow needs a real test (custom lobby worker reachable; same-origin storage/accounts).
6. Multiple bots/TulipBots: parent page can spawn multiple bot iframes, but each full client is heavy and needs an isolated session/origin.
7. AI: best next step is telemetry + parameter search over the existing rule-based automation, then replay/imitation learning; avoid end-to-end RL on mobile.
8. Test the Tab Mode host refactor in a real browser (2026-10-29: user confirmed the host page + Tab Mode basic open works on port 8002; full checklist still pending): host page loads main full UI + music; Bot opens a lazy bot window; close/reopen does not reload bot; bot tick continues while closed; swap changes layout + clean state without reload; Tools size sliders resize the window; position/size survive reload; only `index.html` has SW/update prompt; `client.html` and `bot.html` have neither.
9. Verify bot automation actually keeps ticking while the Tab Mode window is closed. The implementation uses `opacity:0` + `pointer-events:none` + `inert` and keeps the iframe at its last slot size to avoid throttling; if ticks stop, investigate browser throttling.
10. Verify cleanView/DPR behavior on swap: main in the small window should hide FX+game UI and render at DPR 1; bot fullscreen should restore UI at real DPR without reload. Also test a new game starting while clean is enabled.
11. In-match UI-loss bug (2026-10-31): user reported an undefined function, then the main client showed only the map (all text/UI gone) and swap stopped working. Defensive fixes are in the current build. To finish the root-cause fix, reproduce and copy the exact console error, or check `window.__fxTickError` / `window.__fxShipError` / the first `[gc]`/`[shipRoutes]` console entry.

## Key files

- `patches/lobbyTeams.js` - exposes lobby mode, ready players and the current-game info button to the client.
- `src/lobbyTeams.js` - lobby team assignment + draggable WindowManager window.
- `src/windowManager.js` - existing window system used by Tools/Settings/lobby team split.
- `src/instance.js` - `isBotInstance()` / `getHost()` / `isEmbedded()`.
- `src/cleanView.js` - clean/no-UI controller + dynamic DPR getter.
- `src/host/main.js` - host page: main iframe, music, `__fxHost` API.
- `src/host/tabMode.js` - host-owned Bot button/window, iframe layout, swap, persistence, status.
- `static/index.html` - thin host shell.
- `static/client.html` - standalone-capable main client.
- `static/bot.html` - minimal bot page (no SW/update prompt).
- `src/toolbox.js` - Tools full/bot variants; Bot settings + window size sliders.
- `~/tulipbot/bot.js` - mass-botting controller; currently shelved for Tab Mode work.
- `TAB_MODE_SPEC.md` + `TAB_MODE_HOST_PROMPT.md` - Tab Mode plans; the host prompt is authoritative for the refactor.
- `patches/gc_shipRoutes.js` - hooks ship draw and passes ship/path data.
- `src/shipRoutes.js` - route drawing, colors, troop badges, route status.
- `src/theme.js` - theme/tint.
- `src/i18n.js` - English-only identity `t()` / `initI18n()` compatibility wrapper.
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
~/goodclient_v2/TAB_MODE_HOST_PROMPT.md
~/goodclient_v2/TAB_MODE_HOST_HANDOFF.md
~/goodclient_v2/TAB_MODE_SPEC.md
~/goodclient_v2/README_DEV.md
```

Then manually test the host refactor (see HANDOFF known issue 8) and continue from Tab Mode Phase 3 (command layer: attack player/team, hoard, send ships). Remaining earlier tests: lobby team split manual check / ship troop badges / team mode / TulipBot custom lobby.
