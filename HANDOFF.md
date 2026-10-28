# GoodClient / TulipBot Handoff

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
- Remote GitHub `goodclient_v2` is behind local by several commits because github.com git/TLS is unreliable. Last successful remote deployment was the team-tag/green-theme fixes; ship routes and later changes are local only.
- GitHub API publishing was done via a forced-IP Node HTTPS request; no account password was used.

## Known issues / next steps

1. Test the new ship troop badges; if labels overlap or positions are off, tune `src/shipRoutes.js`.
2. Team color mapping currently swaps Black/White; other team colors may still be mismatched. Need real team-mode check.
3. Team-mode bot v20/Land Max needs a real multiplayer team test.
4. TulipBot custom-lobby auto-follow needs a real test (custom lobby worker reachable; same-origin storage/accounts).
5. Multiple bots/TulipBots: parent page can spawn multiple bot iframes, but each full client is heavy and needs an isolated session/origin.
6. AI: best next step is telemetry + parameter search over the existing rule-based automation, then replay/imitation learning; avoid end-to-end RL on mobile.

## Key files

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

Then continue from "test ship troop badges / team mode / TulipBot custom lobby".
