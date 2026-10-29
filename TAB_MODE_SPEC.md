# GoodClient_v2 — Tab Mode / Bot Commander Handoff

This document is for continuing work after the current conversation. Read it fully before changing code.

## 1. Project and current state

Repositories (Termux home):

- `~/goodclient_v2` — the modified FX Client (client code + build patches).
- `~/tulipbot` — host page with `mainFrame` + 3 bot iframes and the Multibot layout.
- `~/tulipbot/relay` — optional WebSocket relay / proxy experiments (not part of this round).

GitHub:

- Repo: `git@github.com:cilIndya-kkkkk/goodclient_v2.git`
- Branch: `goodclient_v2`
- Latest relevant commits:
  - `3f1da67` ci: pin verified game script and fix hostname spoof
  - `d98eca8` feat: add FX settings update checker
  - `cea207e` feat: add named opening presets
  - `f956aff` feat: read music ID3 tags and default UI to English
  - `75118eb` fix: stream music past service worker and resume autoplay on touch
  - `7505f99` feat: add music player with bundled tracks, autoplay and random play

### Important build rule

The live game updated on 2026-10-28. The current AI `g` table and `gc_hostnameSpoof` do **not** match the new game script. Because of this, the GitHub Pages Actions build failed for several commits.

The repository now pins a verified game script:

- `game/latest.js` is tracked in git (force-added; `game/` is otherwise gitignored).
- `.github/workflows/deploy_github_pages.yml` runs **`npm run build-only`**, not `npm run build`.
- Do **not** run `npm run build` unless you are deliberately updating the game compatibility (`g` table + hostname patch). It downloads the 10/28 game and fails with:
  - `no match` in `patches/gc_hostnameSpoof.js`
  - `Automation raw name check failed ...` in `patches/gc_openingAutomation.js`

Use:

```bash
cd ~/goodclient_v2
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build-only       # patches pinned game + builds client
# or
npm run build-client     # only webpack client, copies static/assets
```

Deployment:

- GitHub Pages: Actions workflow "Build and Publish to GitHub Pages" on push to `goodclient_v2`.
- The user also has `goodclientv2.cilindya.workers.dev`; pushing to GitHub does **not** automatically rebuild that Worker. It must be redeployed separately if used.
- The latest verified Pages build (after `3f1da67`) has `buildTimestamp` around `1793188268671`.

## 2. Tab Mode: final UX understanding

The user corrected an earlier misunderstanding. This is the agreed model:

- **Tab Mode bar lives in `goodclient_v2`**, as a draggable small bar similar to the Tools toggle.
- Clicking it opens a floating window.
- The floating window **always defaults to the bot page**, regardless of state. It shows a clean map with **no UI** (no FX panels, no game menus/attack bar).
- The **main client is not shown there by default**. A **switch button** sends the main client into the floating window; the main client in the floating window is also clean/no-UI.
- At the same time, the **bot moves into the main area and restores its full UI**, becoming the playable main view.
- Switching again reverses it: bot back to floating clean view, main client back to main area with UI.
- With multiple bots, Tab Mode should support selecting which bot is in the floating window (Bot 1/2/3). Exact tab UI is still open; recommended: tabs or a bot selector on the Tab Mode bar.
- The swap is the hardest part and the user wants it **last**. Do not start with the swap.

### Why the swap is hard

- `goodclient_v2` lives inside an iframe owned by TulipBot. A client cannot resize/move sibling iframes.
- Recommended architecture:
  - Tab Mode bar/UI is rendered by the client (as requested).
  - The client sends `postMessage` commands to the TulipBot parent.
  - TulipBot owns the iframes and performs layout/swap.
  - The client implements a `clean` mode (hide UI) triggered by URL/postMessage.
- If GoodClient and TulipBot are cross-origin, the parent cannot touch the iframe DOM; use `postMessage` for clean mode and state. If same-origin, direct DOM access is possible but postMessage is still cleaner.
- If the client is opened standalone, Tab Mode should say “host required” or hide.

## 3. Command semantics (agreed)

The floating window exposes commands for the selected bot:

### 攒兵 (hoard)

- Bot performs no attacks / no opening / no infinite expansion / no bot attack.
- It only accumulates troops.
- When density is above **130**, donate **10% troops to the main player**.
- The exact support/donate mechanism still needs research (see section 6).
- Main player must be identified; support likely only works if main and bot are on the same team.

### 发船 (send ships)

- Pressing “发船” enables the bot's normal/default send-ship mode.
- The user then clicks a target location on the floating window's small bot map.
- The click should go through the bot's normal ship-target logic.
- One click = one ship command to that location.

### 攻击队伍 (attack team)

- Select an enemy team from a list/dropdown.
- If bot density is **< 100**: each press attacks once, using **10%**.
- If density is **≥ 100**: pressing starts a continuous attack at **10% every 6 seconds**.
- A **cancel** button stops the continuous attack.
- Exact team-targeting semantics (nearest player on team vs all members vs border tile) is still open.

### 攻击玩家 (attack player)

- Select a player from a list/dropdown.
- Same density rules as attack team: `<100` = single 10% attack per press; `≥100` = 10% every 6 seconds; cancel.
- Use the bot's game state for the player list.

### Bot defaults

- Bot defaults: opening automation on, infinite expansion on, bot attack on (existing defaults).
- These should be configurable from **Tools → Bot settings**.
- Hoard mode temporarily overrides these; define restore behavior when hoard is turned off.

## 4. This round: do basic features first, swap last

The user explicitly wants the swap last. Suggested order:

### Phase A — research / API surface (do first)

1. Inspect the existing automation API:
   - `src/openingAutomation.js`
   - `patches/gc_openingAutomation.js`
   - Existing functions: `attackPlayer`, `attackFreeLand`, `sendAttack`, `cancelAttack`, `setAllAutomationEnabled`, `setAutoAttackMode`, `getBotSpendPercent`, etc.
2. Add a bot command API (`window.__fx.botCommander` or similar) with:
   - `hoard(on)`
   - `sendShipsMode(on)`
   - `attackPlayer(playerId, percent = 10)`
   - `attackTeam(teamId, percent = 10)`
   - `cancel()`
   - state getters: density, troops, land, current mode, continuous attack status.
3. Research the support/donate path (section 6).

### Phase B — attack player + attack team

- Implement target selection from the bot's current game data.
- `attackPlayer` with 10%.
- `attackTeam`: decide how a team maps to an attack target.
- Density <100 = single press; ≥100 = interval 6s; cancel.
- Add status UI in Tab Mode floating window.

### Phase C — hoard

- Disable opening/infinite/bot attack while hoarding.
- Monitor density (`>130`), then support main player 10%.
- Restore defaults when hoard off (confirm with user).

### Phase D — send ships

- Trigger the bot's ship mode.
- Forward/allow map click on the clean bot view.
- Ensure the hidden UI still has the ship mode active.
- One click = one ship target.

### Phase E — Tab Mode clean view + floating window

- Draggable bar, floating window, bot tabs/selector.
- Clean/no-UI mode in the client (hide FX + game UI).
- Command panel UI.
- Keep Multibot/floating-window modes from conflicting.

### Phase F — swap main/bot

- Last. Implement via TulipBot parent + postMessage.
- Swap sizes/positions, toggle clean mode, restore UI, preserve iframe state (no reloads).
- Test 3 bots and cross-origin.

## 5. UI/i18n requirements

- Default UI language is **English** now (for foreign users).
- `Settings → Interface language` still allows `简体中文` / `Auto`.
- All new Tab Mode strings should use `t()` from `src/i18n.js` and be added to the ZH dictionary.
- Do not translate user-generated content (player names, song titles, preset names).
- Existing music player:
  - `src/musicPlayer.js`
  - Draggable `#fxMusicToggle`, panel `#fxMusic`.
  - Bundled tracks in `assets/music/`.
  - ID3 title/artist recognition via `jsmediatags`.
  - Fallback: filename + `Various Artists`.
  - Media requests bypass the service worker (`static/sw2.js`) to avoid buffering.
- Existing opening presets: Tools → Opening (localStorage `fx_opening_presets`).
- Existing update checker: FX Settings bottom (`build-info.json` generated by `build.js`).

## 6. Support / donate via low-level packet — feasibility

Short answer: **possible in principle, but not recommended to hand-build a packet first.**

Why:

- The game already has a support/donation path. Use/hook the game's own function rather than constructing protocol bytes.
- Relevant clues in the pinned build (`build/game.js`):
  - Around old line 6212: `__fx.donationsTracker.logDonation(player, aBM, ij.zr[0], at.b5());`
  - Around old line 11815: `player === c.t || aBM === c.t || ... this.u(y.z[player] + " supported " + y.z[aBM] + " with " + ...)`
  - Localization strings: `"Transmitted Support"`, `"Incoming Bot Support!"`, `"{0} supported you!"`.
  - `patches/patches.js` line ~132 logs donations.
  - `src/donationsTracker.js` line 46 `logDonation(senderID, receiverID, amount, time)`.
- The support action is likely an existing game command (possibly a variant of attack/support with a receiver). Find the UI action or sender function and call it with:
  - receiver = main player id
  - amount/percentage = 10% of bot troops
- Direct packet construction risks:
  - wrong message type/field ordering
  - sequence/checksum/anti-cheat fields
  - server-side validation
  - breaking on every game update
- The main player must be identified (account name/id) and likely must be on the same team. Confirm before promising donate.
- If the game exposes only a UI button, simulate the actual game action (not a forged packet) or hook the function that the button calls.

## 7. Key files and APIs

GoodClient:

- `src/main.js` — init order: i18n, settings, toolbox, music player.
- `src/i18n.js` — ZH dictionary + DOM translator + `t()`.
- `src/settings.js` — settings structure, UI language, update checker, presets? (presets are in toolbox).
- `src/toolbox.js` — Tools panel, opening presets, automation controls.
- `src/openingAutomation.js` — opening state machine, attack APIs.
- `patches/gc_openingAutomation.js` — AI hooks, `g` table, raw-name checks.
- `src/gameInterface.js` — `getVar()` for game state.
- `src/gameScriptUtils.js` — density helpers.
- `src/playerList.js` — player list/team tags.
- `src/customLobby.js` — custom lobby (not relevant to Tab Mode).
- `src/musicPlayer.js` — music player.
- `patches/gc_hostnameSpoof.js` — old/new hostname flag compatibility.
- `build.js` / `index.js` — build scripts; use `build-only`.
- `game/latest.js` — pinned verified game script (do not overwrite unless updating compatibility).
- `.github/workflows/deploy_github_pages.yml` — uses `build-only`.

TulipBot:

- `tulipbot/index.html`, `bot.css`, `bot.js`
- `bot.js` owns `mainFrame`, 3 `.botWindow` iframes, Multibot mode, per-bot reload, relay UI, auto-ready.
- Layout/swap for Tab Mode must be implemented here (parent), not inside a client iframe.

## 8. Acceptance tests for this round

- Attack player: target list populated; <100 density = one 10% attack per press.
- Attack team: target list populated; <100 = one 10% attack; ≥100 = 10% every 6s; cancel stops.
- Hoard: automation stops; density >130 triggers a 10% support attempt to main player (once research is done).
- Send ships: ship mode active; map click sends one ship command.
- Clean view: bot/other client shows map only, no FX/game UI; switching (later) restores UI.
- No iframe reloads/state loss on swap.
- Existing music/i18n/presets/update checker still work.
- Build: `npm run build-only` succeeds; do not break the pinned game build.

## 9. Open decisions to confirm with the user

1. Main player identification: account name, player id, team? Are main and bot on the same team?
2. Attack team semantics: nearest enemy on that team, all team members, or border tile?
3. Density 100/130: game 0–150 density or FX percentage?
4. Clean view: hide all game UI or keep a minimal HUD?
5. Tab Mode bot selection: default Bot 1? Tabs for 1/2/3?
6. Where command buttons live: Tab Mode floating window, bar, or separate panel?
7. Architecture: client bar + TulipBot parent postMessage swap (recommended) vs moving bot iframes into GoodClient (large refactor).
8. Hoard restore behavior: restore previous automation flags or keep them off?

## 10. Do-not-break list

- Do not run `npm run build` (downloads 10/28 game and fails) unless updating the AI `g` table + hostname patch.
- Do not overwrite the pinned `game/latest.js` unless intentionally updating game compatibility.
- Do not break:
  - music player / bundled MP3s / ID3 metadata
  - Chinese/English i18n and default English
  - opening presets
  - update checker / `build-info.json`
  - ship routes / team tags / spawn labels
  - TulipBot Multibot / per-bot reload / relay / auto-ready
- Keep changes additive where possible; the user wants working code preserved.

## 11. Revised Tab Mode plan (2026-10-29)

The lobby team split feature is implemented and pushed. Tab Mode is the next major task. This section records the user's current plan and supersedes earlier phase ordering where it conflicts.

### User's proposed order

1. Tab Mode shell: a floating toggle button opens a floating window. Inside the window show a normal game interface, then the bot. At the same time, bot settings should appear in Tools.
2. Hide the bot's in-game UI (clean view).
3. Implement the command layer: attack player/team, hoard, send ships.

### Recommended implementation split

- GoodClient owns the Tab Mode button/window UI and the Tools bot-settings section.
- TulipBot parent owns the bot iframes and layout when the bot is a sibling iframe; use `postMessage` for show/hide/clean/commands.
- If the bot is embedded inside GoodClient instead, the floating window can host an iframe directly, but this is a larger refactor and must not reload the iframe on toggle.
- Reuse `WindowManager` for the floating window (already proven by Tools/Settings) or an existing fixed panel; do not create another windowing system.
- Clean view must be a mode, not a reload: URL parameter or `postMessage` sets a `clean` flag that hides FX UI and game UI.
- Tools bot settings should target the selected bot; define selected-bot state explicitly.

### Phase 1 acceptance

- Floating button visible and draggable.
- Click opens/closes the window without reloading the bot iframe.
- Window shows the bot's normal playable game UI.
- Bot settings appear in Tools.
- Main client remains usable.
- No regression to music/i18n/presets/update checker/ship routes/TulipBot Multibot.

### Open decisions before coding

1. Is the bot iframe owned by TulipBot parent or embedded inside the GoodClient window?
2. Does the window show the bot by default, or the main client first? The wording "正常的游戏界面然后是bot" needs confirmation.
3. One bot, or a Bot 1/2/3 selector?
4. Do Tools bot settings apply to all bots or only the selected bot?
5. Does the Tab Mode button live in GoodClient (same page as the main game) or in TulipBot parent?

Sections 3-4 (command semantics, phase order) remain the reference for attack/hoard/send-ships behavior.

### Progress and resolved decisions (2026-10-29)

Resolved with the user:

- Scope is **GoodClient only**. TulipBot is for mass botting and is shelved; do not route Tab Mode through `~/tulipbot`.
- One bot only (no Bot 1/2/3 selector).
- The floating window defaults to the bot.
- `Tools → Bot settings` applies only to the bot shown in Tab Mode.
- Because GoodClient owns the bot iframe, the window hosts that iframe directly; no parent-page `postMessage` layer is needed for Phase 1.

Phase 1 implemented (needs browser test):

- `src/tabMode.js`: draggable `Tab` toggle + floating panel, lazy single bot iframe, `?tabbot=1` marks the bot instance so it does not create nested Tab Mode UI.
- Toggle hide/show only; the iframe is not reloaded when the window closes.
- `src/toolbox.js`: `Bot settings` section targeting the Tab Mode bot; hidden in the `?tabbot=1` instance.
- i18n and CSS updated; `npm run build-client` passes.

Next: manual Phase 1 test, then Phase 2 (clean/no-UI view for the bot), then Phase 3 command layer (attack player/team, hoard, send ships).
