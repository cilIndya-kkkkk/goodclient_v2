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
- Remote GitHub `goodclient_v2` is up to date as of 2026-10-29, including the lobby team split panel. HTTPS push is unreliable on this network (SSL EOF / connect failures). The working fallback is the SSH remote: `git push git@github.com:cilIndya-kkkkk/goodclient_v2.git goodclient_v2` (`gh` is authenticated as `cilIndya-kkkkk`, git protocol is SSH). The older workaround was a forced-IP Node HTTPS request (no account password).

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

## Key files

- `patches/lobbyTeams.js` - exposes lobby mode, ready players and the current-game info button to the client.
- `src/lobbyTeams.js` - lobby team assignment + fixed floating panel UI.
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
~/goodclient_v2/README_DEV.md
~/tulipbot/README.md
```

Then continue from "test lobby team split panel / ship troop badges / team mode / TulipBot custom lobby".
