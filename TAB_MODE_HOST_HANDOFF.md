# Tab Mode Host Refactor — Handoff for Claude

Last updated: 2026-10-29 (commit `ccaec57`)

This document is for a different model/engineer continuing Tab Mode. Read `HANDOFF.md`, `TAB_MODE_SPEC.md` (section 11) and this file first. The user is Chinese-speaking; UI strings are English by default with a ZH dictionary.

## 0. Short version

The current Tab Mode bot view is **the same `index.html` client loaded again with `?tabbot=1`**. It works, but:

- it still loads the FX service worker and the “new version available” prompt;
- clicking update/reloading can lose the tab-bot state and turn the view into a full client;
- the bot is a clone of GoodClient, which the user does not want;
- a real main/bot **swap** is impossible while the main client is the top-level document.

The user’s conclusion is correct: the bot must be a **separate minimal page**, and to make the swap work without reloads the main client and the bot must both be **iframes owned by a thin host page**. Only CSS layout/position should change on swap; never reparent or reload an iframe.

Recommended next architecture: `tab.html` (host, owns 2 iframes + Tab Mode chrome) + `bot.html` (minimal bot page) + a clean-view API on both client pages. Keep `index.html` usable standalone.

## 1. Environment / commands

Repos (Termux home):

- `~/goodclient_v2` — modified FX Client (client + build patches)
- `~/tulipbot` — mass-botting controller; **shelved**, do not use for Tab Mode
- Build pinned game script: `game/latest.js`

Build commands:

```bash
cd ~/goodclient_v2
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build-client      # webpack client + copy static/assets; NO game patches
npm run build-only        # patch pinned game + client; this is what GitHub Actions uses
# npm run build           # DO NOT USE: downloads the 10/28 game and fails
```

Local preview:

```bash
python3 -m http.server 8001 --directory /data/data/com.termux/files/home
# http://localhost:8001/goodclient_v2/build/
```

Deploy: push to `goodclient_v2` branch. Actions “Build and Publish to GitHub Pages” runs `npm run build-only`. Push over SSH because HTTPS is unreliable:

```bash
git push git@github.com:cilIndya-kkkkk/goodclient_v2.git goodclient_v2
```

## 2. Current Tab Mode implementation

- `src/tabMode.js`
  - `isTabBotInstance()` == URL search has `tabbot=1`.
  - `initTabMode()`: floating `Bot` button + floating panel with a single lazy iframe to the same client + `?tabbot=1`. Panel opens/closes by CSS only.
  - `initBotCleanView()`: only in the bot instance. Polls and forces the game’s built-in hidden-UI flag:
    - `window.c.gG` is the game’s UI-hidden boolean.
    - `window.nr.nE(true/false)` toggles it.
    - `c` and `nr` are top-level `var`s in the pinned `game.js`; they are globals because `build.js` strips the IIFE wrapper.
    - Poll every 500 ms because a new game can reset `gG`.
- `src/main.js`
  - `const isTabBot = isTabBotInstance();`
  - In the bot: caps `window.devicePixelRatio` to 1 before `game.js` loads; skips `initI18n`, music, theme, ship routes, toolbox, in-game automation panel; keeps settings, custom lobby, lobby teams, automation and game.
- `src/toolbox.js` → `Tools → Bot settings`
  - Targets only `window.__fx.tabMode.getBotFx()`; status, reload, All On/Off, Opening, Infinite, bot mode.
  - Hidden inside a `?tabbot=1` instance.
- CSS in `static/main.css`
  - `#fxTabModeToggle` is a Tools-style floating button, `#fxTabMode` is the floating panel.
  - Panel size is TulipBot-like + a bit larger:
    `width: min(38vw, 460px); height: min(38vh, 340px); min-width: 260px; min-height: 190px;`
- Tab UI mounts inside `#windowContainer` (a `SPAN`), not directly on `body`.

## 3. Hard-won findings (do not relearn these)

1. **The game deletes direct body `DIV`/`INPUT`/`BUTTON` children.**
   In the pinned `build/game.js`, `aI2.b` iterates `document.body.firstChild` and removes direct children whose tag is `DIV`, `INPUT` or `BUTTON`. This detached the first Tab Mode button/panel. FX’s toolbox/music re-attach themselves on timers.
   → Mount Tab UI inside `#windowContainer` (a `SPAN`) and/or re-attach on a timer.

2. **Clean view exists in the game.** `window.c.gG` = UI hidden. `window.nr.nE(value)` toggles it (the game’s “Switch UI Visibility” shortcut calls the same function). When `gG === true` the game draws the map and a small bar only.
   - Caveat: `gG === true` short-circuits the native click handler (`nr.nP` returns true), so **native map clicks are swallowed** while clean. Phase 3 send-ships must translate clicks to game coordinates itself.
   - Because it is a supported game feature, it should survive game updates unless names change.

3. **Update prompt is page-level, not client-level.** The prompt + `navigator.serviceWorker` registration live in the inline script in `static/index.html`. Any copy of that page will show it. The bot page must not include the SW registration/update markup.

4. **Top-level main client cannot be moved into an iframe** without a reload. A real swap needs both clients to be iframes from the start (host page).

5. **Never move/reparent an iframe to swap.** Reparenting can reload it. Keep both iframes as fixed-position children of the host and only change `left/top/width/height/z-index/visibility`.

6. **Service worker caches everything** under its scope (see `static/sw2.js`). New HTML entries need cache-busting query strings or the SW can serve stale content. `build.js` only currently stamps `build/index.html` and `build/sw2.js`.

## 4. Recommended architecture

### 4.1 Entry points

- `build/index.html` — main client, still usable standalone. Add support for `?host=1` so it does **not** create its own Tab Mode UI when embedded.
- `build/bot.html` — minimal bot page. Same scripts as the client (`variables.js`, `fx.bundle.js`, `game.js`) but:
  - **no** service worker registration;
  - **no** update notification markup/script;
  - contains only the static DOM the bundle needs (`#canvasA`, `#windowContainer`, `.settings` skeleton, etc. — audit `getElementById` calls first);
  - URL includes `?bot=1` (rename `tabbot` or accept both) and maybe `&v=<buildTimestamp>`.
- `build/tab.html` — thin host page:
  - owns `#fxMainFrame` (`index.html?host=1`) and `#fxBotFrame` (`bot.html?bot=1`, lazy-created on first Tab Mode open);
  - owns the Tab Mode button, floating chrome, bot status, reload, and the switch button;
  - no service worker;
  - loads `host.js` (plain script or small bundle).

The normal `index.html` can keep the current in-client Tab Mode for now; once the host works, remove it or show “open tab.html”. Do not maintain two implementations long-term.

### 4.2 Host layout / swap

Both iframes are direct children of `body`, `position: fixed`, loaded once, never reparented.

- Default: main iframe `inset: 0`; bot iframe sized/positioned into the Tab Mode window area.
- Swapped: bot iframe `inset: 0`; main iframe in the window area.
- Window area is either explicit coordinates set on the iframe, or a fixed container whose rect is read; keep the iframe as a sibling of the chrome, not a child of a scrollable container.
- Dragging/resizing the window updates the iframe rect and the chrome rect together.
- Closing the window must **not** unload the iframe. Prefer `visibility: hidden` over `display: none` if the bot must keep rendering/automating while closed; test whether `display: none` throttles the bot. This is an open question.
- Swap must call a clean-view API on both clients (see 4.3). No reload.

### 4.3 Clean-view API (both pages)

Add to `src/main.js` (or `src/tabMode.js`) a small controller exposed as `window.__fx.cleanView`:

```js
setEnabled(enabled, { hideFx = true } = {})
```

- Waits/polls for `window.nr` / `window.c` (game globals) and calls `window.nr.nE(Boolean(enabled))`.
- Reapplies if a new game resets `c.gG`.
- When `hideFx` is true, add a body class (e.g. `fx-clean`) and CSS-hide all FX UI (`#fxToolboxToggle`, `#fxToolbox`, `#fxMusicToggle`, `#fxMusic`, `#fxTabMode*`, `#demonAutomationControls`, maybe `#windowContainer` FX windows).
- When disabled, restore the previous UI state without reloading.
- The host calls it same-origin: `frame.contentWindow.__fx.cleanView.setEnabled(...)`.

Desired states:

- Default: main `clean=false`, bot `clean=true`.
- Swapped: main `clean=true`, bot `clean=false`.

### 4.4 Bot page UI vs performance

The current bot skips FX modules, which is fast but means it cannot “restore full UI” when swapped to the main area without a reload. Choose one:

- **A (simpler):** load full modules in `bot.html`, hide FX UI via `fx-clean` when in the window; restore on swap. Keep DPR cap and the smaller viewport. Accept the extra idle intervals/audio overhead (stop music in clean mode).
- **B (faster):** lazy-initialize FX modules (`toolbox`, `music`, `theme`, `automationControls`) the first time the bot is swapped to main. More code, still no reload.
- **C (minimal “full UI”):** define “full UI” as the game UI + automation, not FX extras. Then the bot page can stay lean; document this with the user.

Recommend A for correctness, then measure; move to B if lag remains.

### 4.5 Bot page static DOM

Audit these before trimming `bot.html`:

- `#canvasA`
- `#windowContainer`
- `.settings` (Settings UI is static HTML and `settings.js` queries `.settings .scrollable` at startup)
- `#customLobbyJoinMenu`, `#lobbyCode`, `#createLobbyButton`, `#customLobbyRegion`, `#playerlist`, `#playerlist_content`, `#customBackgroundFileInput`, `#donationhistory*`, update notification only if needed
- The game may append its own DOM.

Safest first version: copy the body markup of `index.html` into `bot.html`, delete the SW/update `<script>` and update-notification block, then iteratively trim while testing.

## 5. Build changes

`build.js` currently:

- copies `static/` and `assets/`;
- stamps `build/index.html` and `build/sw2.js` with `buildTimestamp`.

Needed:

- stamp `tab.html` / `bot.html` too, or inject the version at runtime from `build-info.json`;
- make `host.js` use versioned URLs for the iframes (`?v=<timestamp>`) to avoid SW stale cache;
- ensure `npm run build-only` still passes;
- keep `game/latest.js` untouched.

`bot.html` must not register `sw2.js`. Note: the SW registered by `index.html` still controls the whole `/build/` scope and can cache `bot.html`; version the URL.

## 6. Acceptance tests

1. Standalone `index.html` still works exactly as before (with or without in-client Tab Mode).
2. Host page loads main full UI and bot in a small clean window.
3. Bot page shows no update prompt and does not register a service worker.
4. Closing/reopening the window does not reload the bot (`contentWindow` identity stable; game tick continues).
5. Switch main↔bot changes only layout + clean state, no reloads, no lost match.
6. After a new game starts, the clean state is reapplied.
7. Dragging/resizing the window keeps the iframe aligned with the chrome.
8. Swap back restores both UIs.
9. Existing features (music, i18n, presets, update checker, ship routes, lobby team split) still work.
10. `npm run build-only` succeeds; Pages deploy succeeds.
11. Performance: bot DPR is 1; clean mode hides FX UI; measure with both clients in a match.

## 7. Open questions for the user

1. Entry URL: should Tab Mode be a new `tab.html`, or should `index.html` become the host shell (breaking old URLs)?
2. When the bot is swapped into the main area, does “full UI” include FX extras (Tools/music) or only the game UI + automation?
3. When the Tab Mode window is closed, must the bot keep playing/automating at full speed? (Affects `display:none` vs `visibility:hidden`.)
4. Should the window be resizable, and what exact size/persistence?
5. Which player is the “main player” for hoard/support, and are main and bot on the same team? (Phase 3.)
6. Attack-team semantics: nearest enemy, all members, or border tile? (Phase 3.)

## 8. Do not break

- `npm run build-only` / pinned `game/latest.js`
- music player, ID3, bundled tracks
- i18n default English + ZH dictionary
- opening presets, update checker
- ship routes, team tags, spawn labels
- lobby team split
- TulipBot files (shelved, out of scope)
- Existing automation APIs in `src/openingAutomation.js`

## 9. Suggested model

This is mostly careful code reading + a multi-file refactor with no automated browser tests in this environment. A current **Claude Opus-class** model is the safest choice; a **Claude Sonnet-class** model can do it if given this document and the repo. The model matters less than giving it:

- this file,
- `HANDOFF.md`, `TAB_MODE_SPEC.md`, `README_DEV.md`,
- `src/main.js`, `src/tabMode.js`, `src/toolbox.js`, `static/index.html`, `static/main.css`, `build.js`, `patches/main.js`,
- and asking it to first propose the file-level plan and wait for confirmation before the host-page refactor.

## 10. Minimum next step (if the full host refactor is too much)

1. Add `static/bot.html` (client markup without SW/update prompt) and point the existing Tab Mode iframe at it with `?bot=1&v=<timestamp>`.
2. Rename/accept `bot=1` in `isTabBotInstance()`.
3. Keep the current single-iframe Tab Mode for now.
4. Defer `tab.html` + swap until the user confirms the full-UI/closed-window questions.

This removes the update prompt and the “turns into full client” failure with a small, low-risk change.

### Status (2026-10-29): minimum next step implemented

- `static/bot.html`: client markup minus SW registration and `#updateNotification`; an inline script forces `?bot=1` into the URL on load and reload.
- `build.js` stamps `index.html` and `bot.html` (and still `sw2.js`).
- `src/tabMode.js`: `isTabBotInstance()` accepts `bot=1`, legacy `tabbot=1`, or a path ending in `bot.html`. The iframe loads `bot.html?bot=1&v=<stamp>`; the stamp comes from the `fx.bundle.js?<stamp>` script tag, and `relay` is passed through.
- `npm run build-client` and `npm run build-only` both pass. No browser test has been run in this environment yet.
- Still to do: the `tab.html` host, swapping, and the clean-view API (sections 4.1–4.3), pending answers to section 7.

### Status (2026-10-29, later): full host refactor implemented

The `TAB_MODE_HOST_PROMPT.md` refactor has been implemented locally (not pushed yet). Current shape:

- `index.html` is the thin host (SW + update prompt + `host.bundle.js`).
- `client.html` is the main client iframe (`?host=1&v=<stamp>`); it can still be opened standalone.
- `bot.html` is the minimal bot iframe (`?bot=1&v=<stamp>`) with no SW/update prompt.
- `src/host/main.js` owns `#fxMainFrame`, lazy `#fxBotFrame`, host music and `window.__fxHost`.
- `src/host/tabMode.js` owns the Bot button, window chrome (`Swap` / `Reload bot` / `Close`), slot-based iframe layout, swap, drag, size/position persistence, status polling and clean-state calls.
- `src/instance.js` centralizes `isBotInstance()` / `getHost()` / `isEmbedded()`.
- `src/cleanView.js` hides game UI via `c.gG` + `nr.nE()` polling, adds `body.fx-clean`, and installs the dynamic DPR getter. Exception: while `c.ao === true` (spawn selection), the game UI is shown so the spawn buttons remain usable; it hides again after spawning.
- Settings are isolated (`fx_settings_bot`; first run copies `fx_settings`). Toolbox positions and the hostfix flag are per-instance; `fx_ui_language` stays shared.
- Tools variants: main embedded = full + Bot settings + window size sliders; bot = Automation-only; direct `client.html` = full without Bot settings.
- Music runs only in the host. Client/bot iframes skip it; host forwards iframe pointer/key/touch gestures to the autoplay handler.
- Embedded client fixes: update-checker reload/fullscreen go through `__fxHost`; custom-lobby copy link uses host URL; Tools music button opens host music.

Close behavior: the bot iframe is **not** unloaded and not `display:none`. It uses `opacity:0` + `pointer-events:none` + `inert`, keeps its last slot size, and stays in the DOM so automation/ticks can continue. This was chosen over `visibility:hidden`/`display:none` to avoid throttling; it still needs a real browser tick test.

Build: `npm run build-client` and `npm run build-only` pass. Webpack now has two entries (`fx.bundle.js`, `host.bundle.js`), dynamic chunks use content hashes, and `index/client/bot` are stamped. Only `index.html` has SW registration/update markup.

Manual test checklist: use `TAB_MODE_HOST_PROMPT.md` §6. Pay special attention to: bot tick while closed, no reload on close/reopen/swap, main never hidden when closing while swapped, clean/DPR on swap, Tools size sliders, and host-only music surviving swaps/reloads.

2026-10-29: user confirmed the host page and basic Tab Mode open work in a real browser (port 8002). Not pushed yet. Local commits: `0ed8b7b`, `99327a2`, `8f7a788`, `d545eb7`, `37f4a3b`, plus `b3b026f` (final stage 6) and `d29ae32` (status i18n).
