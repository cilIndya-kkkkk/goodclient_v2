# GoodClient / TulipBot Handoff

Last updated: 2026-11-02

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
- 2026-10-31 in-match UI-loss bug (fixed): the re-derived ship-route hook passed `zt: dr.iL`, an unbound method. `shipRoutes.js` is an ES module, so `this` was undefined inside `dr.iL` and it threw `this.iK is not a function` every frame. The throw happened after `ctx.save()`/`setTransform`, before `ctx.restore()`, so the rest of the canvas UI (text) was drawn with the wrong transform and the loop looked like “map only”; swap then appeared broken. Fix: `zt: function (value) { return dr.iL(value); }`. Extra hardening: ship-route draw and automation tick hooks are wrapped in try/catch with one-time logs (`__fxShipError`, `__fxTickError`), ship-route canvas state is restored in `finally`, `cleanView` guards missing game globals and can force `ct.ur` + `hE.resize()`, and the host retries clean-state calls on error.

## Game update 2026-10-31 (Territorial.io 2.16.67)

- `game/latest.js` is now the 2026-10-31 script (version `🎃 31 Oct 2026 [2.16.67]`). The previous 2.16.66 script is backed up locally at `game/latest_2.16.66.js` (not committed).
- The game re-obfuscated all core names. The old g table no longer exists. The new `g` table (35 names) was derived by token-aligning the 2.16.66 script (known g table) against the 2.16.67 script with identifier wildcards. The new core names match the Omen-era names (`ad`, `ae`, `bB`, `bv`, `bP`, `bV`, ...); support/mouse/viewport/UI names are `bD/gv/jB/rB`, `bW/hg/hh`, `i/l`, `bF/a4M`.
- `patches/gc_shipRoutes.js` was re-derived for 2.16.67: ship manager is `bQ.z` (`mk/mz/mo/a8n/mm/my/aa4/ml`), map renderer `bP` (`jJ` tile→packed, `fP` tile→byte offset), colors `bj.aSu/bj.aCs`, canvas `ws`, recall `bQ.mt.aa2`, intercept `bW.hg` + `bW.hh(2)`. The hook now injects at `this.wr=function(){var oF=im;` (outside the `oF>=5` guard) so it keeps running when zoomed in.
- New game feature: account market (Sell Account / Buy This Account). Sellers set an asking price in gold and a receiving account; buyers confirm with gold; the purchased account is assigned the buyer's current password. The client UI is the game's own account profile; no FX patch is needed. Account Vault can store purchased accounts.
- `npm run build-only` passes with the new script and all current patches. A live-game smoke test is still required, especially for automation, ship tools, leaderboard, name rendering, custom lobby, and map commands.
- Version bumped to FX Client 0.6.35.

## Next task handoff (not implemented)

The Shipping panel + Tools UI redesign round is implemented (2026-10-31); the Account Vault UI entry is currently hidden while cloud sync is unconfigured; see `SHIPPING_TOOLS_HANDOFF.md` for the confirmed rules and the manual test checklist below.

## Current state

- GoodClient base: FX Client 0.6.35 + Omen automation + hostname spoof; pinned game is Territorial.io 2.16.67 (2026-10-31).
- Automation defaults on; multiplayer works.
- Spawn point names, name-size slider, team tags (map troop labels + player list + spawn labels).
- Team-mode automation targeting was patched (team-aware canAttack + target range includes enemy players); needs real team-mode testing.
- Theme: cream/pale green; DOM UI themed; whole-screen tint. Menu background is a plain cream gradient (line dog removed).
- UI language: **English-only**. The Chinese dictionary/DOM translator and the Interface language setting were removed. `src/i18n.js` now exposes an identity `t()` for compatibility. The game's own UI language is still set in the game's Options -> Language.
- Music player: `src/musicPlayer.js` + `assets/music/` (two bundled t+pazolite tracks). Floating music icon (draggable, spins while playing), panel with play/pause/prev/next/repeat/shuffle, local file picker (IndexedDB persistence), cloud URL playlist (localStorage), volume and seek. Built-in tracks cannot be removed.
- Account Vault (2026-10-31): `Tools → Accounts → Account Vault` (`src/accountVault.js`) is a local-only password book. Entries are encrypted at rest with an AES-256-GCM device key stored as a CryptoKey in IndexedDB (`fx_account_vault`); no master password is needed for daily use. Copy user / Copy pass is the only game-login integration (copy/paste; the game flow is untouched). Export downloads an encrypted JSON backup and shows a one-time recovery code; the raw vault key is wrapped with PBKDF2-SHA-256 (310k) + AES-GCM, and import requires that code. No server upload and no Pages sync. Security caveat: same-origin game/script code can read entries while the vault is open; this protects the at-rest copy, not a compromised page. Export files must not be committed to the public repo.
- Turnstile: not bypassed. Keep manual verification; only smoother retry/status handling is acceptable.
- 2026-11-02 UI trim: the Account Vault entry was removed from Tools (the Accounts page/card is gone) and its Usage Guide section was removed while the Worker/D1 backend is not configured. The backend still runs by default: `src/accountVault.js`, `src/vaultSync.js` and `worker/` remain, auto-sync still starts in the main client, and `window.__fx.vaultSync` is still available from the console.
- Cloud vault sync (2026-11-02, experimental): `src/vaultSync.js` watches the game account storage (`v105`/`v106`, `d105`/`d106`, or `window.bm.buffer.data[105/106]`) and, after a login is detected, calls `upsertVaultAccount()` and uploads the vault. The sync ID is a random 64-hex `fx_vault_sync_hash`; the upload filename is `<hash>.bin`. Sync encryption is AES-256-GCM with SHA-256("asdfGG12345"); the client uses a fixed key, so this is obfuscation, not zero-knowledge. The endpoint defaults to `https://goodclient-vault.cilindya.workers.dev/vault` and can be overridden with `localStorage.fx_vault_sync_endpoint`.
  - `worker/` contains the Cloudflare Worker (`src/index.js`), D1 schema (`schema.sql`), `wrangler.toml` (placeholder database id) and deployment steps (`worker/README.md`). The Worker stores only `filename`, encrypted `BLOB` and `updated_at`; the hash is the capability secret. D1 free plan is about 5 GB / 5M reads/day / 100k writes/day.
  - The Worker is NOT deployed yet; the user must create the D1 database, paste its id, run the schema and `wrangler deploy`. Until then sync fails gracefully and the local vault keeps working.
  - Standalone admin page: `worker/vault-admin.html` (not part of the GoodClient build or Pages); it calls `GET /vault/list` with `Authorization: Bearer <ADMIN_TOKEN>`, lists `filename/bytes/updated_at` and downloads `GET /vault/<hash>.bin`. Set the Worker secret with `wrangler secret put ADMIN_TOKEN`. The page keeps the token in sessionStorage only and does not decrypt files.
- Lobby chat Unicode button (2026-11-02): `src/chatUnicode.js` observes the DOM for the chat input (`Type your message here...` / a sibling Send button), injects an absolute `Unicode` button to the left of Send, and converts ASCII letters/digits/punctuation to fullwidth Unicode in the input (dispatching an `input` event so the game picks it up). It is initialized in `src/main.js`; no game patch.
- Shipping tools (2026-10-31, implemented; live test pending):
  - Lobby team split was deleted: `src/lobbyTeams.js`, `patches/lobbyTeams.js`, its init/import, CSS and Help entry are gone.
  - Tools is now a card menu (Automation, Opening, Shipping, Display, Bot when embedded, Accounts, Help) with detail pages, a Back button and the existing Close button. The bot variant still opens Automation directly and has no menu/Back.
  - Settings defaults: `showShipProgress`, `showShipPanel` (both true), `autoRecallBlockedShips`, `autoInterceptShips` (both false). Panel height is `fx_ship_panel_height`.
  - `patches/gc_shipRoutes.js` always passes ship state now, including `segmentProgress` (`kZ`), `shipStatus` (`kX`), owners, troops, positions, routes and the route index. It exposes `__fx.shipControl.recallShip(index)` (`h0.kc.pt`) and `interceptShip(index, percent)` (set attack %, `aIC.aID` + `aIC.aIJ(2)`).
  - `src/shipRoutes.js` stores `__fx.shipState`, computes progress (`kv + kZ/65535` over route length), draws routes (toggle), troop/progress badges (independent toggles), and a red X on my blocked ships.
  - `src/shipIntel.js` produces `__fx.shipIntel`: my ships, attackers (enemy ships near my ship/path, ~8 tiles), blockers (stronger enemy within ~2.2 tiles of my route ahead, 18 points), colors, and `__fx.shipAuto` for recall/shield/auto intercept. Auto recall is deferred outside the draw loop.
  - `src/shipPanel.js` is a fixed left panel below the leaderboard (`__fx.leaderboardRect` from `patches/leaderboard.js`), height-draggable and persisted, with an Auto checkbox. Rows show my ship troops/progress and attackers; attacker names are red below 10% of my total troops, purple otherwise; attacker rows have a Shield button.
  - Intercept timing: enemy progress >= 0.9; sends `enemyTroops * 1.05 / myTotalTroops`; skips if my total troops are insufficient. Manual Shield and Auto share the same pending queue.
  - Known risks: `leaderboardRect` units, attacker/blocker radii, `interceptShip` action semantics, and red X/panel overlap need a real match to tune.
  - 2026-11-02 fixes: the ship hook was inside the game's `if (!(5 <= aIc))` ship-draw guard, so at high zoom it never ran (routes vanished, panel/intel froze). The hook now injects after `var aIc=e5;` and before that guard, so state/routes/panel update at every zoom. Targets are decoded from each route endpoint with `dr.iI(tile)` (byte offset) + `d5.l3/hp`; the panel now shows `game name → target` and `unoccupied` for neutral land, using `playerNames` instead of `rawPlayerNames`. Detection now scans the enemy's remaining route as well, with attacker radius 12 tiles, blocker radius 3.5, 32 own lookahead points and 24 enemy lookahead points; panel status shows attacker/blocked counts.
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
  - Account Vault (2026-10-31): `src/accountVault.js`, `Tools → Accounts`. Uses `crypto.subtle` (HTTPS/localhost required), IndexedDB, AES-256-GCM, PBKDF2 310k for the backup recovery code. Verify in a real browser: add/copy/edit/delete, export → import on a fresh profile, wrong recovery code rejection, and the empty-vault first run. The vault panel mounts in `#windowContainer` and locks (clears in-memory entries) on close.
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
12. Shipping tools manual test: remove lobby split (no info-area window); Tools card menu/back; Shipping toggles; progress badges independent of routes; panel below leaderboard with height persistence; my ship troops/progress; attacker colors (<10% red, otherwise purple); red X on blocked my ship; auto recall when enabled; Shield manual intercept and Auto intercept at the last 10% with 105% troops; insufficient troops skipped. Also confirm `interceptShip` actually launches/works on 2.16.66.
11. In-match UI-loss bug (2026-10-31, fixed): unbound `dr.iL` in the ship-route hook threw `this.iK is not a function` every frame after `ctx.save()`, leaving the canvas transform wrong so the UI text disappeared; swap looked broken. Fixed by wrapping `dr.iL` in a function. Defensive guards remain (`__fxShipError`, `__fxTickError`, cleanView force fallback). If it recurs, check those console entries.

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
- `src/accountVault.js` - local encrypted account vault (device key, export/import recovery code).
- `src/chatUnicode.js` - lobby chat Unicode converter button.
- `src/vaultSync.js` - optional Worker/D1 vault sync (fixed key, local hash, auto login detect).
- `worker/` - Cloudflare Worker + D1 schema/config + deployment README.
- `src/helpPanels.js` + `src/helpContent.js` - Tools changelog/usage guide UI and English content.
- `~/tulipbot/bot.js` - mass-botting controller; currently shelved for Tab Mode work.
- `TAB_MODE_SPEC.md` + `TAB_MODE_HOST_PROMPT.md` - Tab Mode plans; the host prompt is authoritative for the refactor.
- `patches/gc_shipRoutes.js` - hooks ship draw and passes ship/path data.
- `src/shipRoutes.js` - route drawing, progress badges, red X, ship state.
- `src/shipIntel.js` - my ships/attackers/blockers and auto recall/intercept.
- `src/shipPanel.js` - leaderboard shipping panel (height drag, Auto, attacker colors/shields).
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
