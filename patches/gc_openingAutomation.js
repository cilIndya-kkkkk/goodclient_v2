import { definePatch } from "../modUtils.js";

// Ported from OmenClient's patches/patches.js (2.16.51) for the current
// Territorial.io build. The build-time dictionary resolves the readable game
// names; the "g" table below is the set of raw property/global names the
// injected tick code reads directly. They are obfuscated and get reshuffled on
// every game release, so they must be re-derived (see README_DEV.md) whenever
// the raw-name check below throws.
const g = {
  mapData: "j1",
  attackManager: "a0n",
  protocolHandler: "ss",
  teamUtils: "a0f",
  playerTiles: "xT",
  neighborOffsets: "a1g",
  isNeutralTile: "zb",
  isOwnedTile: "zY",
  getTileOwner: "zZ",
  getAvailableAttackCount: "q7",
  getAttackTarget: "q8",
  getAttackValue: "q9",
  gameCommandSender: "a1M",
  sendAttack: "xn",
  sendSupport: "a5f",
  cancelAttack: "xr",
  canAttack: "a1W",
  mapIsRendered: "u4",
  mapRenderer: "ix",
  screenToX: "zR",
  screenToY: "zT",
  screenToTileX: "oR",
  screenToTile: "j3",
  screenInBounds: "zV",
  supportUtils: "aa",
  supportMath: "bY",
  supportAmount: "a3b",
  supportCalc: "aLr",
  mouseActions: "a8P",
  setMouse: "a1B",
  runMouseAction: "a1C",
  viewport: "aW",
  pixelScale: "eB",
};

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => applyOpeningAutomation(modUtils));
});

function applyOpeningAutomation(modUtils) {
  const { replaceOne, safeDictionary: dict, script } = modUtils;
  const rawPlayerNames = `${dict.playerData}.${dict.rawPlayerNames}`;

  const missingRawNames = [];
  [
    [`${g.mapData}.${g.neighborOffsets}`, "MapData.neighborOffsets"],
    [`${g.mapData}.${g.isNeutralTile}(`, "MapData.isNeutralTile"],
    [`${g.mapData}.${g.isOwnedTile}(`, "MapData.isOwnedTile"],
    [`${g.mapData}.${g.getTileOwner}(`, "MapData.getTileOwner"],
    [`${dict.playerData}.${g.playerTiles}`, "PlayerData.playerTiles"],
    [`${g.attackManager}.${g.getAvailableAttackCount}(`, "AttackManager.getAvailableAttackCount"],
    [`${g.attackManager}.${g.getAttackTarget}(`, "AttackManager.getAttackTarget"],
    [`${g.attackManager}.${g.getAttackValue}(`, "AttackManager.getAttackValue"],
    [`${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack}(`, "GameCommandSender.sendAttack"],
    [`${g.protocolHandler}.${g.gameCommandSender}.${g.sendSupport}(`, "GameCommandSender.sendSupport"],
    [`${g.protocolHandler}.${g.gameCommandSender}.${g.cancelAttack}(`, "GameCommandSender.cancelAttack"],
    [`${g.teamUtils}.${g.canAttack}(`, "TeamUtils.canAttack"],
    [`${dict.mapHolder}.${g.mapIsRendered}`, "MapManager.mapIsRendered"],
    [`${g.mapRenderer}.${g.screenToX}(`, "MapRenderer.screenToX"],
    [`${g.mapRenderer}.${g.screenToY}(`, "MapRenderer.screenToY"],
    [`${g.mapRenderer}.${g.screenToTileX}(`, "MapRenderer.screenToTileX"],
    [`${g.mapRenderer}.${g.screenToTile}(`, "MapRenderer.screenToTile"],
    [`${g.mapRenderer}.${g.screenInBounds}(`, "MapRenderer.screenInBounds"],
    [`${g.supportUtils}.${g.supportMath}.${g.supportAmount}(`, "SupportMath.supportAmount"],
    [`${g.supportUtils}.${g.supportMath}.${g.supportCalc}(`, "SupportMath.supportCalc"],
    [`${g.mouseActions}.${g.setMouse}(`, "MouseActions.setMouse"],
    [`${g.mouseActions}.${g.runMouseAction}(`, "MouseActions.runMouseAction"],
    [`${g.viewport}.${g.pixelScale}`, "Viewport.pixelScale"],
  ].forEach(([access, readableName]) => {
    if (!script.includes(access))
      missingRawNames.push(`"${access}" (${readableName})`);
  });
  if (missingRawNames.length)
    throw new Error("Automation raw name check failed for: " + missingRawNames.join(", ")
      + ". The game was updated -- re-derive the g table in patches/gc_openingAutomation.js.");

  const openingAutomationInjection = `$1
            // MapData's global instance. The name is asserted at build time, but it is still read
            // through typeof and used with ?. everywhere below: this block runs every tick via
            // onTick/onTickAutoAttack, so a bad read must degrade to a safe default (false/0/null/
            // no-op) rather than throw a ReferenceError and take the render loop down with it.
            var __fxAd = typeof ${g.mapData} !== "undefined" ? ${g.mapData} : undefined;
            var __fxTargetStart = (humans) => ${dict.game}.${dict.gIsTeamGame} ? 0 : humans;
            // Attacks are not sent through the click-to-attack UI dispatcher at all: attackFreeLand
            // below calls GameCommandSender.sendAttack directly, which is the same call the UI path
            // ends in, minus the input handling.
            __fx.openingAutomation.attack=()=> __fx.openingAutomation.attackFreeLand();
            // The per-player "attack border" tile list is PlayerData.playerTiles (g.playerTiles):
            // MapData's classification loop pushes a tile onto it exactly when
            // MapData.hasAdjacentAttackableTile(tile, player) is true, i.e. the tile has a
            // neutral-or-enemy neighbor. __fxAd (MapData's global instance) supplies the primitives
            // that narrow that down to neutral-only: g.neighborOffsets is the real 4-direction
            // neighbor offset array (Int32Array sized to the actual map width, NOT a hardcoded
            // stride) and g.isNeutralTile(tile) is the real neutral check. __fxNeutralBorderTileCount
            // walks those tiles' neighbors and dedupes, matching ThighClient's
            // getNeutralBorderTileCount exactly.
            var __fxNeutralBorderTileCount = ()=> {
                var player = ${dict.game}.${dict.playerId};
                var borderTiles = ${dict.playerData}.${g.playerTiles}?.[player];
                if (!borderTiles || !borderTiles.length) return 0;
                var offsets = __fxAd?.${g.neighborOffsets};
                if (!offsets || typeof __fxAd.${g.isNeutralTile} !== "function") return 0;
                var seen = new Set();
                var count = 0;
                for (var i = borderTiles.length - 1; i >= 0; i--) {
                    var tile = borderTiles[i];
                    for (var d = 0; d < 4; d++) {
                        var neighbor = tile + offsets[d];
                        var key = neighbor >> 2;
                        if (seen.has(key)) continue;
                        if (!__fxAd.${g.isNeutralTile}(neighbor)) continue;
                        seen.add(key);
                        count++;
                    }
                }
                return count;
            };
            __fx.openingAutomation.hasFreeLandAroundPlayer=()=> __fxNeutralBorderTileCount() > 0;
            // Ported from ThighClient MPV3's runRawBotAttacks (the function actually wired into its
            // main loop -- not the elaborate scored findRawBotAttackTarget, which is dead code there,
            // never called from anything reachable at runtime). Real bot-phase attacks there are just:
            // walk the player's border tiles' real neighbors, collect adjacent bot-owned tiles,
            // keep the single largest one under 0.2% density. Reuses the same playerTiles/__fxAd
            // primitives as
            // __fxNeutralBorderTileCount, swapped from "is this neighbor neutral" to "is this neighbor
            // an attackable bot" (owned + in the bot id range). Deliberately does NOT touch the attack
            // percent -- ThighClient's own version calls attackTargetWithCurrentPercent (reads
            // whatever's already on the slider), so this only picks a target; the caller sends with
            // whatever __fx.keybindFunctions.getAttackPercentage() already is, same as everywhere else.
            __fx.openingAutomation.findBorderBotAttackTarget=()=> {
                var player = ${dict.game}.${dict.playerId};
                var borderTiles = ${dict.playerData}.${g.playerTiles}?.[player];
                if (!borderTiles || !borderTiles.length) return -1;
                var offsets = __fxAd?.${g.neighborOffsets};
                if (!offsets || typeof __fxAd.${g.isOwnedTile} !== "function" || typeof __fxAd.${g.getTileOwner} !== "function") return -1;
                var humans = ${dict.game}.${dict.gHumans};
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                var lastTick = __fx.openingAutomation.lastTick;
                var seen = new Set();
                var bestId = -1;
                var bestLand = -1;
                for (var i = borderTiles.length - 1; i >= 0; i--) {
                    var tile = borderTiles[i];
                    for (var d = 0; d < 4; d++) {
                        var neighbor = tile + offsets[d];
                        if (!__fxAd.${g.isOwnedTile}(neighbor)) continue;
                        var owner = __fxAd.${g.getTileOwner}(neighbor);
                        if (owner < __fxTargetStart(humans) || owner >= maxPlayers || owner === player || seen.has(owner)) continue;
                        seen.add(owner);
                        if (recentTargets?.has(owner) && lastTick - recentTargets.get(owner) < 30) continue;
                        var land = ${dict.playerData}.${dict.playerTerritories}[owner] || 0;
                        if (land <= bestLand) continue;
                        var troops = ${dict.playerData}.${dict.playerBalances}[owner] || 0;
                        var density = land > 0 ? troops / (land * 150) * 100 : Infinity;
                        if (!isFinite(density) || density > 0.2) continue;
                        bestId = owner;
                        bestLand = land;
                    }
                }
                return bestId;
            };
            __fx.openingAutomation.findV20ReserveBotAttackTarget=(tick, attackPercent)=> {
                var player = ${dict.game}.${dict.playerId};
                var borderTiles = ${dict.playerData}.${g.playerTiles}?.[player];
                if (!borderTiles || !borderTiles.length) return -1;
                var offsets = __fxAd?.${g.neighborOffsets};
                if (!offsets || typeof __fxAd.${g.isOwnedTile} !== "function" || typeof __fxAd.${g.getTileOwner} !== "function") return -1;
                var humans = Number(${dict.game}.${dict.gHumans});
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                if (!isFinite(humans) || humans < 1) return -1;
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[player] || 0;
                var ownLand = ${dict.playerData}.${dict.playerTerritories}[player] || 0;
                if (ownTroops <= 0 || ownLand <= 0) return -1;
                var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                var activeTargets = __fx.openingAutomation.automatedBotAttacks;
                var cycle = Math.floor(tick / 100);
                var breakeven = { 9: 1.84, 10: 2.01, 11: 2.16, 12: 2.25, 13: 2.27, 14: 2.18, 15: 1.95, 16: 1.56, 17: 1.88 };
                var maxCostPerLand = (breakeven[cycle] || 1.8) * 2.0;
                if (ownTroops > ownLand * 70) maxCostPerLand = Math.max(maxCostPerLand, 6);
                var minLand = Math.max(300, Math.floor(ownLand * 0.005));
                var sendTroops = ownTroops * Math.max(0, Math.min(0.11, Number(attackPercent) || 0));
                if (sendTroops < 200) return -1;
                var seen = new Set();
                var bestId = -1;
                var bestScore = -1;
                for (var i = borderTiles.length - 1; i >= 0; i--) {
                    var tile = borderTiles[i];
                    for (var d = 0; d < 4; d++) {
                        var neighbor = tile + offsets[d];
                        if (!__fxAd.${g.isOwnedTile}(neighbor)) continue;
                        var id = __fxAd.${g.getTileOwner}(neighbor);
                        if (id < __fxTargetStart(humans) || id >= maxPlayers || id === player || seen.has(id)) continue;
                        seen.add(id);
                        if (!__fxCanAttack(player, id) || !__fxBorders(id, player)) continue;
                        if (activeTargets?.has(id)) continue;
                        if (recentTargets?.has(id) && tick - recentTargets.get(id) < 20) continue;
                        var land = ${dict.playerData}.${dict.playerTerritories}[id] || 0;
                        if (land < minLand) continue;
                        var troops = ${dict.playerData}.${dict.playerBalances}[id] || 0;
                        var density = troops / Math.max(1, land);
                        var costPerLand = 2 * (1 + 1.6 * density);
                        if (!isFinite(costPerLand) || costPerLand > maxCostPerLand) continue;
                        var killCost = costPerLand * land / (253 / 256);
                        var expectedLand = Math.min(sendTroops, killCost) / Math.max(2, costPerLand);
                        var completionRatio = Math.min(1, sendTroops / Math.max(1, killCost));
                        var efficiencyMultiplier = Math.pow(2 / Math.max(2, costPerLand), 0.70);
                        var score = expectedLand * efficiencyMultiplier * (0.70 + completionRatio * 0.30);
                        if (score > bestScore) {
                            bestId = id;
                            bestScore = score;
                        }
                    }
                }
                return bestId;
            };
            __fx.openingAutomation.getDeployedTroops=()=> {
                var player = ${dict.game}.${dict.playerId};
                if (typeof ${g.attackManager} !== "undefined" && typeof ${g.attackManager}.${g.getAvailableAttackCount} === "function") {
                    var freeLandTarget = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                    var count = ${g.attackManager}.${g.getAvailableAttackCount}(player) || 0;
                    for (var attackIndex = count - 1; attackIndex >= 0; attackIndex--) {
                        var target = ${g.attackManager}.${g.getAttackTarget}(player, attackIndex);
                        if (target === freeLandTarget) return ${g.attackManager}.${g.getAttackValue}(player, attackIndex) || 0;
                    }
                }
                return 0;
            };
            __fx.openingAutomation.getNeutralOutgoing=()=> __fx.openingAutomation.getDeployedTroops();
            __fx.openingAutomation.getNeutralBorderTileCount=()=> __fxNeutralBorderTileCount();
            __fx.openingAutomation.getPlayerTroops=()=> ${dict.playerData}.${dict.playerBalances}[${dict.game}.${dict.playerId}];
            __fx.openingAutomation.getPlayerLand=()=> ${dict.playerData}.${dict.playerTerritories}[${dict.game}.${dict.playerId}];
            __fx.openingAutomation.attack=()=> __fx.openingAutomation.attackFreeLand();
            __fx.openingAutomation.attackFreeLand=()=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                var freeLandTarget = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                var percent = __fx.keybindFunctions.getAttackPercentage();
                var sliderValue = Math.max(0, Math.min(1023, Math.round(percent * 1024 - 1)));
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack}(sliderValue, freeLandTarget);
                    return true;
                }
                return false;
            };
            __fx.openingAutomation.attackFreeLandWithPercent=(percent)=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                percent = Math.max(0, Math.min(1, Number(percent || 0)));
                var freeLandTarget = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                var sliderValue = Math.max(0, Math.min(1023, Math.round(percent * 1024 - 1)));
                __fx.keybindFunctions.setAbsolute(percent);
                __fx.keybindFunctions.repaintAttackPercentageBar();
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack}(sliderValue, freeLandTarget);
                    return true;
                }
                return false;
            };
            var __fxCanAttack = (attacker, target)=> {
                if (!${dict.game}.${dict.gIsTeamGame}) return true;
                if (typeof ${g.teamUtils} !== "undefined" && typeof ${g.teamUtils}.${g.canAttack} === "function") {
                    return ${g.teamUtils}.${g.canAttack}(attacker, target);
                }
                return true;
            };
            var __fxBorders = (left, right)=> {
                if (typeof ${g.teamUtils} !== "undefined" && typeof ${g.teamUtils}.${g.canAttack} === "function") {
                    return ${g.teamUtils}.${g.canAttack}(left, right);
                }
                return true;
            };
            // Deliberately inert stubs. The scoring helpers that use them (inferBotAttackTarget,
            // getBotExposure and the map-walking branches of the safe/best bot scorers) therefore
            // always fall through to their empty result, which is the behaviour the current
            // targeting was tuned against -- do not "fix" them without re-running the benchmarks.
            // The real primitives now exist on __fxAd (g.neighborOffsets / g.isOwnedTile /
            // g.getTileOwner / g.isNeutralTile) if these are ever wired up for real; note they also
            // read ${dict.playerData}.gp / .go for the bot's tiles, which is a name from an older
            // build and no longer resolves either.
            var __fxOffsets = ()=> [1, -1, 512, -512];
            var __fxTileOwned = (tile)=> false;
            var __fxTileOwner = (tile)=> undefined;
            var __fxTileNeutral = (tile)=> false;
            __fx.openingAutomation.attackPlayer=(target)=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                var humans = Number(${dict.game}.${dict.gHumans});
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                // Automated attacks are bot-only. Fail closed if the human/bot boundary
                // is unavailable, and re-check here so no selector can accidentally send
                // an attack against another player.
                if (!isFinite(humans) || humans < 1) return false;
                if (target < __fxTargetStart(humans) || target >= maxPlayers) return false;
                var targetLand = ${dict.playerData}.${dict.playerTerritories}[target];
                if (!targetLand || targetLand <= 0) return false;
                if (!__fxCanAttack(${dict.game}.${dict.playerId}, target)) return false;
                var percent = Number(__fx.keybindFunctions.getAttackPercentage?.() || 0.32);
                if (!isFinite(percent) || percent <= 0) percent = 0.32;
                __fx.keybindFunctions.setAbsolute(percent);
                __fx.keybindFunctions.repaintAttackPercentageBar();
                var sliderValue = Math.max(0, Math.min(1023, Math.round(percent * 1024 - 1)));
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack}(sliderValue, target);
                    return true;
                }
                return false;
            };
            var __fxCanSupportTarget = (target)=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                if (!${dict.game}.${dict.gIsTeamGame}) return false;
                var player = ${dict.game}.${dict.playerId};
                target = Number(target);
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                if (!isFinite(target) || target < 0 || target >= maxPlayers || target === player) return false;
                if ((${dict.playerData}.${dict.playerTerritories}[target] || 0) <= 0) return false;
                if (typeof ${g.teamUtils} === "undefined" || typeof ${g.teamUtils}.${g.canAttack} !== "function") return false;
                if (${g.teamUtils}.${g.canAttack}(player, target)) return false;
                return true;
            };
            __fx.openingAutomation.getMaxSupportPercent=(target)=> {
                if (!__fxCanSupportTarget(target)) return 0;
                var player = ${dict.game}.${dict.playerId};
                var support = ${g.supportUtils}.${g.supportMath};
                if (!support || typeof support.${g.supportAmount} !== "function" || typeof support.${g.supportCalc} !== "function") return 0;
                var best = -1;
                for (var sliderValue = 0; sliderValue < 1024; sliderValue++) {
                    var amount = support.${g.supportAmount}(player, sliderValue);
                    if (support.${g.supportCalc}(player, amount, Number(target))) best = sliderValue;
                }
                return best < 0 ? 0 : (best + 1) / 1024;
            };
            __fx.openingAutomation.canSupport=(target)=> __fxCanSupportTarget(target) && __fx.openingAutomation.getMaxSupportPercent(target) > 0;
            __fx.openingAutomation.sendSupport=(target, percent)=> {
                if (!__fxCanSupportTarget(target)) return false;
                percent = Number(percent);
                if (!isFinite(percent)) percent = 0.1;
                percent = Math.max(0, Math.min(1, percent));
                var sliderValue = Math.max(0, Math.min(1023, Math.round(percent * 1024 - 1)));
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.sendSupport} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.sendSupport}(sliderValue, target);
                    return true;
                }
                return false;
            };
            __fx.openingAutomation.canAttackTarget=(target)=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                target = Number(target);
                var player = ${dict.game}.${dict.playerId};
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                if (!isFinite(target) || target < 0 || target >= maxPlayers || target === player) return false;
                if ((${dict.playerData}.${dict.playerTerritories}[target] || 0) <= 0) return false;
                return __fxCanAttack(player, target);
            };
            __fx.openingAutomation.attackPlayerTarget=(target, percent)=> {
                if (!__fx.openingAutomation.canAttackTarget(target)) return false;
                percent = Number(percent);
                if (!isFinite(percent)) percent = 0.09;
                percent = Math.max(0, Math.min(1, percent));
                var sliderValue = Math.max(0, Math.min(1023, Math.round(percent * 1024 - 1)));
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.sendAttack}(sliderValue, Number(target));
                    return true;
                }
                return false;
            };
            __fx.botMap = __fx.botMap || {};
            __fx.botMap.playerAt = function(clientX, clientY) {
                try {
                    var scale = (__fx.hoveringTooltip && __fx.hoveringTooltip.canvasPixelScale) || 1;
                    var coordX = ${g.mapRenderer}.${g.screenToX}(Number(clientX) * scale);
                    var coordY = ${g.mapRenderer}.${g.screenToY}(Number(clientY) * scale);
                    if (!${g.mapRenderer}.${g.screenInBounds}(coordX, coordY)) return -1;
                    var tile = ${g.mapRenderer}.${g.screenToTile}(${g.mapRenderer}.${g.screenToTileX}(coordX, coordY));
                    if (!${g.mapData}.${g.isOwnedTile}(tile)) return -1;
                    return ${g.mapData}.${g.getTileOwner}(tile);
                } catch (_error) {
                    return -1;
                }
            };
            __fx.botMap.launchShipAt = function(clientX, clientY, percent) {
                try {
                    var scale = ${g.viewport}.${g.pixelScale} || 1;
                    var value = Number(percent);
                    if (!isFinite(value)) value = 0.04;
                    value = Math.max(0, Math.min(1, value));
                    var keybinds = __fx.keybindFunctions;
                    var previous = keybinds && typeof keybinds.getAttackPercentage === "function" ? keybinds.getAttackPercentage() : null;
                    if (keybinds && typeof keybinds.setAbsolute === "function") {
                        keybinds.setAbsolute(value);
                        if (typeof keybinds.repaintAttackPercentageBar === "function") keybinds.repaintAttackPercentageBar();
                    }
                    ${g.mouseActions}.${g.setMouse}(Math.floor(scale * Number(clientX)), Math.floor(scale * Number(clientY)));
                    ${g.mouseActions}.${g.runMouseAction}(1);
                    if (previous !== null && keybinds && typeof keybinds.setAbsolute === "function") {
                        keybinds.setAbsolute(previous);
                        if (typeof keybinds.repaintAttackPercentageBar === "function") keybinds.repaintAttackPercentageBar();
                    }
                    return true;
                } catch (_error) {
                    return false;
                }
            };
            __fx.openingAutomation.cancelPlayerAttack=(target)=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                if (target < 0 || target >= ${dict.game}.${dict.gLobbyMaxJoin}) return false;
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.cancelAttack} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.cancelAttack}(target);
                    return true;
                }
                return false;
            };
            __fx.openingAutomation.cancelFreeLandAttack=()=> {
                if (${dict.game}.${dict.gIsReplay}) return false;
                var freeLandTarget = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                if (typeof ${g.protocolHandler} !== "undefined" && ${g.protocolHandler}.${g.gameCommandSender} && typeof ${g.protocolHandler}.${g.gameCommandSender}.${g.cancelAttack} === "function") {
                    ${g.protocolHandler}.${g.gameCommandSender}.${g.cancelAttack}(freeLandTarget);
                    return true;
                }
                return false;
            };
            __fx.openingAutomation.getTargetLand=(target)=> ${dict.playerData}.${dict.playerTerritories}[target];
            __fx.openingAutomation.getTargetTroops=(target)=> ${dict.playerData}.${dict.playerBalances}[target];
            __fx.openingAutomation.getBotAttackSnapshot=(target)=> {
                if (target < ${dict.game}.${dict.gHumans} || target >= ${dict.game}.${dict.gLobbyMaxJoin}) return null;
                var targetLand = ${dict.playerData}.${dict.playerTerritories}[target];
                if (targetLand <= 0) return null;
                var targetTroops = ${dict.playerData}.${dict.playerBalances}[target];
                var targetDensity = targetTroops / (targetLand * 150) * 100;
                var attackPercent = Number(__fx.keybindFunctions.getAttackPercentage?.() || 0);
                var playerTroops = ${dict.playerData}.${dict.playerBalances}[${dict.game}.${dict.playerId}];
                return {
                    target,
                    targetName: ${rawPlayerNames}[target],
                    targetLand,
                    targetTroops,
                    targetDensity: Number(targetDensity.toFixed(4)),
                    attackPercent: Number(attackPercent.toFixed(4)),
                    playerTroops,
                    attackTroops: Math.floor(playerTroops * attackPercent)
                };
            };
            __fx.openingAutomation.isLiveLowDensityBotTarget=(target, mode, reserved)=> {
                if (target < ${dict.game}.${dict.gHumans} || target >= ${dict.game}.${dict.gLobbyMaxJoin}) return false;
                var land = ${dict.playerData}.${dict.playerTerritories}[target];
                if (land <= 0) return false;
                if (!__fxBorders(target, ${dict.game}.${dict.playerId}) || !__fxCanAttack(${dict.game}.${dict.playerId}, target)) return false;
                var troops = ${dict.playerData}.${dict.playerBalances}[target];
                var density = troops / (land * 150);
                if (reserved) return isFinite(density) && density <= 0.3;
                if (mode === "raw") {
                    var rawDensity = density * 100;
                    var record = (__fx.openingAutomation.safeBotDensityTracker ||= new Map()).get(target);
                    var now = __fx.openingAutomation.lastTick;
                    var attackTarget = __fx.openingAutomation.inferBotAttackTarget(target);
                    var landGrowthAge = record?.landGrowthTick !== undefined ? now - record.landGrowthTick : Infinity;
                    var lowDensityAge = record?.rawLowDensityTick !== undefined ? now - record.rawLowDensityTick : Infinity;
                    var sizeableTarget = attackTarget && (attackTarget.land >= 300 || attackTarget.land >= land * 0.08);
                    var movingWindow = sizeableTarget && landGrowthAge <= 35;
                    var freshLowDensity = lowDensityAge <= 18;
                    var stationaryException = rawDensity <= 0.1 && land >= 1800 && freshLowDensity;
                    return isFinite(rawDensity) && rawDensity <= 0.3 && (movingWindow || stationaryException);
                }
                if (mode !== "safe" && mode !== "best") return isFinite(density) && density <= 0.2;
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[${dict.game}.${dict.playerId}];
                var estimatedKillCost = troops * 2;
                return isFinite(density) && estimatedKillCost <= ownTroops * 0.55;
            };
            __fx.openingAutomation.findLowDensityBorderingBots=(limit, mode)=> {
                var targets = [];
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    if (${dict.playerData}.${dict.playerTerritories}[id] <= 0) continue;
                    if (id === ${dict.game}.${dict.playerId} || !__fxBorders(id, ${dict.game}.${dict.playerId}) || !__fxCanAttack(${dict.game}.${dict.playerId}, id)) continue;
                    var density = ${dict.playerData}.${dict.playerBalances}[id] / (${dict.playerData}.${dict.playerTerritories}[id] * 150);
                    if (density >= 0.4) continue;
                    targets.push({ id, density, land: ${dict.playerData}.${dict.playerTerritories}[id], balance: ${dict.playerData}.${dict.playerBalances}[id] });
                }
                if (mode === "small") targets.sort((a, b) => a.density - b.density || a.land - b.land || a.balance - b.balance);
                else targets.sort((a, b) => a.density - b.density || b.land - a.land || b.balance - a.balance);
                return targets.slice(0, limit || 10).map(target => target.id);
            };
            __fx.openingAutomation.updateSafeBotDensityTracker=()=> {
                var playerId = ${dict.game}.${dict.playerId};
                var now = __fx.openingAutomation.lastTick;
                if (!isFinite(now) || now < 0) now = 0;
                if (__fx.openingAutomation.safeBotDensityTrackerLastUpdate === now) return;
                __fx.openingAutomation.safeBotDensityTrackerLastUpdate = now;
                var tracker = __fx.openingAutomation.safeBotDensityTracker ||= new Map();
                var seen = new Set();
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (land <= 0) continue;
                    var record = tracker.get(id) || {};
                    record.landDelta = isFinite(record.land) ? land - record.land : 0;
                    if (isFinite(record.land) && land > record.land) {
                        record.landGrowthTick = now;
                    }
                    if (__fxBorders(id, playerId) && __fxCanAttack(playerId, id)) {
                        var density = ${dict.playerData}.${dict.playerBalances}[id] / (land * 150);
                        if ((!isFinite(record.density) && density < 0.12) || (isFinite(record.density) && record.density >= 0.25 && density < 0.12)) {
                            record.fullsendAt = performance.now();
                        }
                        var rawDensity = density * 100;
                        if (rawDensity <= 0.3) {
                            record.rawLowDensityTick = now;
                        }
                        record.density = density;
                        record.rawDensity = rawDensity;
                    }
                    record.land = land;
                    record.seenAt = now;
                    tracker.set(id, record);
                    seen.add(id);
                }
                tracker.forEach((record, id)=> {
                    if (!seen.has(id) || now - (record.seenAt || 0) > 150) tracker.delete(id);
                });
            };
            __fx.openingAutomation.inferBotAttackTarget=(botId)=> {
                var tracker = __fx.openingAutomation.safeBotDensityTracker ||= new Map();
                var botTiles = ${dict.playerData}.gp?.[botId] || ${dict.playerData}.go?.[botId] || [];
                var offsets = __fxOffsets();
                if (!botTiles.length || offsets.length < 4) return null;
                var best = null;
                for (var tileIndex = botTiles.length - 1; tileIndex >= 0; tileIndex--) {
                    var tile = botTiles[tileIndex];
                    for (var offsetIndex = 3; offsetIndex >= 0; offsetIndex--) {
                        var neighbor = tile + offsets[offsetIndex];
                        if (__fxTileNeutral(neighbor) || !__fxTileOwned(neighbor)) continue;
                        var owner = __fxTileOwner(neighbor);
                        if (owner === botId || owner < ${dict.game}.${dict.gHumans} || owner >= ${dict.game}.${dict.gLobbyMaxJoin}) continue;
                        var record = tracker.get(owner);
                        if (!record || !isFinite(record.landDelta) || record.landDelta >= 0) continue;
                        var land = ${dict.playerData}.${dict.playerTerritories}[owner];
                        if (land <= 0) continue;
                        var loss = -record.landDelta;
                        var score = loss * Math.sqrt(Math.max(1, land));
                        if (!best || score > best.score) best = { id: owner, land, loss, score };
                    }
                }
                return best;
            };
            __fx.openingAutomation.getBotExposure=(botId)=> {
                var playerId = ${dict.game}.${dict.playerId};
                var botTiles = ${dict.playerData}.gp?.[botId] || ${dict.playerData}.go?.[botId] || [];
                var offsets = __fxOffsets();
                var botNeighbors = new Set();
                var playerEdges = 0;
                var botEdges = 0;
                if (!botTiles.length || offsets.length < 4) return { botNeighbors: 0, botEdges: 0, playerEdges: 0, ratio: 0 };
                for (var tileIndex = botTiles.length - 1; tileIndex >= 0; tileIndex--) {
                    var tile = botTiles[tileIndex];
                    for (var offsetIndex = 3; offsetIndex >= 0; offsetIndex--) {
                        var neighbor = tile + offsets[offsetIndex];
                        if (__fxTileNeutral(neighbor) || !__fxTileOwned(neighbor)) continue;
                        var owner = __fxTileOwner(neighbor);
                        if (owner === botId) continue;
                        if (owner === playerId) {
                            playerEdges++;
                        } else if (owner >= ${dict.game}.${dict.gHumans} && owner < ${dict.game}.${dict.gLobbyMaxJoin} && ${dict.playerData}.${dict.playerTerritories}[owner] > 0) {
                            botNeighbors.add(owner);
                            botEdges++;
                        }
                    }
                }
                return {
                    botNeighbors: botNeighbors.size,
                    botEdges,
                    playerEdges,
                    ratio: botEdges / Math.max(1, playerEdges)
                };
            };
            __fx.openingAutomation.findWeakEncapsulatedBot=(attackPercent, mode)=> {
                __fx.openingAutomation.updateSafeBotDensityTracker();
                var playerId = ${dict.game}.${dict.playerId};
                var nowTick = __fx.openingAutomation.lastTick;
                var tickInCycle = nowTick % 100;
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[playerId];
                var ownLand = ${dict.playerData}.${dict.playerTerritories}[playerId];
                if (ownTroops <= 0 || ownLand < 18000 || tickInCycle > 88) return null;
                var requestedPercent = Number(attackPercent);
                var landCap = ownLand < 60000 ? 0.18 : 0.12;
                var cycleCap = tickInCycle < 35 ? 0.26 : tickInCycle < 70 ? 0.38 : 0.42;
                var maxPercent = Math.min(cycleCap, landCap);
                if (isFinite(requestedPercent) && requestedPercent > 0) maxPercent = Math.min(maxPercent, requestedPercent);
                var reserveTroops = ownTroops * 0.18;
                var taxTroops = Math.floor(ownTroops * 12 / 1024);
                var maxSendTroops = Math.max(0, ownTroops - reserveTroops - taxTroops);
                maxSendTroops = Math.min(maxSendTroops, ownTroops * maxPercent);
                if (maxSendTroops < 1) return null;
                var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                var best = null;
                var bestScore = -1;
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (land < 120 || land > Math.max(2400, ownLand * 0.10)) continue;
                    if (id === playerId || !__fxBorders(id, playerId) || !__fxCanAttack(playerId, id)) continue;
                    if (recentTargets?.has(id) && nowTick - recentTargets.get(id) < 18) continue;
                    var exposure = __fx.openingAutomation.getBotExposure(id);
                    if (exposure.playerEdges < 8 || exposure.botNeighbors > 1) continue;
                    var troops = ${dict.playerData}.${dict.playerBalances}[id];
                    var density = land > 0 ? troops / (land * 150) * 100 : Infinity;
                    if (!isFinite(density) || density > 0.42) continue;
                    var required = 2 * (land + troops) / (253 / 256);
                    var plannedSendTroops = Math.min(required * 1.16, maxSendTroops);
                    var oneShotRatio = plannedSendTroops / Math.max(1, required);
                    if (oneShotRatio < 1.04 || oneShotRatio > 1.75) continue;
                    var percent = Math.max(0.02, Math.min(maxPercent, plannedSendTroops / Math.max(1, ownTroops)));
                    var score = (land * 2.2 + exposure.playerEdges * 12) * oneShotRatio / Math.sqrt(Math.max(density, 0.06));
                    if (score > bestScore) {
                        best = { target: id, percent, score, oneShotRatio, land, density, exposure };
                        bestScore = score;
                    }
                }
                __fx.openingAutomation.lastWeakEncapsulatedSelection = best;
                return best;
            };
            __fx.openingAutomation.findBestDynamicBotAttackTarget=(tick, options)=> {
                options = options || {};
                __fx.openingAutomation.updateSafeBotDensityTracker();
                var playerId = ${dict.game}.${dict.playerId};
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[playerId];
                var _atkCount = __fxAd ? (__fxAd.gF || __fxAd.gG)?.(playerId) || 0 : 0;
                var _ownOutgoing = 0;
                for (var _ai = 0; _ai < _atkCount; _ai++) { _ownOutgoing += (__fxAd.gK ? __fxAd.gL : __fxAd.gM)?.(playerId, _ai) || 0; }
                if (_ownOutgoing / Math.max(1, ownTroops + _ownOutgoing) >= 0.5) return null;
                var ownLand = ${dict.playerData}.${dict.playerTerritories}[playerId];
                var tickInCycle = tick % 100;
                var fixedPercent = Number(options.fixedPercent);
                var hasFixedPercent = isFinite(fixedPercent) && fixedPercent > 0;
                var forceBest = options.forceBest === true;
                var safeMode = options.mode === "safe";
                var reserveRatio = tickInCycle < 35 ? 0.44 : tickInCycle < 70 ? 0.26 : 0.18;
                var landCap = ownLand < 60000 ? 0.30 : ownLand < 90000 ? 0.15 : 0.10;
                var cycleCap = tickInCycle < 35 ? 0.26 : tickInCycle < 70 ? 0.38 : 0.42;
                var maxPercent = hasFixedPercent ? Math.min(0.50, Math.max(0.01, fixedPercent)) : Math.min(cycleCap, landCap);
                var taxTroops = Math.floor(ownTroops * 12 / 1024);
                var maxSendTroops = Math.max(0, ownTroops - ownTroops * reserveRatio - taxTroops);
                maxSendTroops = Math.min(maxSendTroops, ownTroops * maxPercent);
                if (maxSendTroops < 1) return null;
                var minLand = ownLand < 10000 ? 180 : ownLand < 30000 ? 260 : ownLand < 60000 ? 500 : 700;
                var minScore = tickInCycle < 35
                    ? (ownLand < 60000 ? 520 : 850)
                    : tickInCycle < 70
                        ? (ownLand < 60000 ? 700 : 1050)
                        : (ownLand < 60000 ? 1150 : 1850);
                var stockpilePressure = ownTroops / Math.max(1, ownLand);
                var tracker = __fx.openingAutomation.safeBotDensityTracker ||= new Map();
                var best = null;
                var bestScore = -1;
                var fallbackBest = null;
                var fallbackBestScore = -1;
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (land < minLand) continue;
                    if (id === playerId || !__fxBorders(id, playerId) || !__fxCanAttack(playerId, id)) continue;
                    var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                    if (recentTargets?.has(id) && tick - recentTargets.get(id) < (forceBest ? 8 : 14)) continue;
                    var troops = ${dict.playerData}.${dict.playerBalances}[id];
                    var density = land > 0 ? troops / (land * 150) * 100 : Infinity;
                    var maxAllowedDensity = safeMode ? 0.3 : 0.32;
                    if (!isFinite(density) || density > maxAllowedDensity) continue;
                    var record = tracker.get(id);
                    var attackTarget = __fx.openingAutomation.inferBotAttackTarget(id);
                    var landGrowthAge = record?.landGrowthTick !== undefined ? tick - record.landGrowthTick : Infinity;
                    var lowDensityAge = record?.rawLowDensityTick !== undefined ? tick - record.rawLowDensityTick : Infinity;
                    var targetIsSizeable = attackTarget && (attackTarget.land >= (safeMode ? 180 : 300) || attackTarget.land >= land * (safeMode ? 0.04 : 0.08));
                    var movingWindow = targetIsSizeable && landGrowthAge <= (safeMode ? 55 : 35);
                    var freshLowDensity = lowDensityAge <= (safeMode ? 42 : 30);
                    var earlyStationaryException = ownLand < 15000 && density <= (safeMode ? 0.24 : 0.11) && land >= 220 && freshLowDensity;
                    var stationaryException = density <= (safeMode ? 0.24 : 0.12) && land >= (safeMode ? 850 : 1200) && freshLowDensity;
                    var stockpileException = stockpilePressure >= 0.85 && density <= (safeMode ? 0.28 : 0.11) && land >= (safeMode ? 900 : 1500);
                    if (stockpilePressure >= 1.1 && density <= (safeMode ? 0.3 : 0.12) && land >= (safeMode ? 1500 : 2500)) stockpileException = true;
                    var oneShotRequired = 2 * (land + troops) / (253 / 256);
                    var desiredSendTroops = oneShotRequired * (movingWindow ? 1.18 : 1.28);
                    var plannedSendTroops = hasFixedPercent ? maxSendTroops : Math.min(desiredSendTroops, maxSendTroops);
                    var oneShotRatio = plannedSendTroops / Math.max(1, oneShotRequired);
                    if (forceBest) {
                        var forcedDensityScore = Math.pow(land, safeMode ? 1.35 : 1.22) / Math.sqrt(Math.max(density, 0.05));
                        var forcedKillScore = Math.min(1.4, Math.max(0.25, oneShotRatio));
                        var forcedScore = forcedDensityScore * forcedKillScore;
                        if (forcedScore > fallbackBestScore) {
                            fallbackBest = {
                                target: id,
                                percent: Math.max(0.02, Math.min(maxPercent, plannedSendTroops / Math.max(1, ownTroops))),
                                score: forcedScore,
                                oneShotRatio,
                                forced: true
                            };
                            fallbackBestScore = forcedScore;
                        }
                    }
                    if (!movingWindow && !earlyStationaryException && !stationaryException && !stockpileException) continue;
                    var troopKillRatio = plannedSendTroops / Math.max(1, troops * 2.8);
                    if (oneShotRatio < (movingWindow ? 0.95 : 1.05) || oneShotRatio > 2.25) continue;
                    var exposure = __fx.openingAutomation.getBotExposure(id);
                    var exposurePenalty = 1 / (1 + Math.max(0, exposure.botNeighbors - 2) * 0.12);
                    var movingBonus = movingWindow ? 2.4 : stockpileException ? 1.35 : 1;
                    var windowBonus = attackTarget ? 1 + Math.min(1.5, Math.sqrt(Math.max(1, attackTarget.land)) / 65) : 1;
                    var oneShotBonus = 2.4 + Math.min(0.8, oneShotRatio - 1);
                    var troopKillBonus = Math.min(1.4, Math.max(0.7, troopKillRatio));
                    var valueRatio = land / Math.max(1, oneShotRequired);
                    var incomeUrgency = tickInCycle <= 70 ? 1 + (70 - tickInCycle) / 140 : 1;
                    var overpayPenalty = 1 / (1 + Math.max(0, oneShotRatio - 1.25) * 0.45);
                    var score = Math.pow(land, safeMode ? 1.28 : 1.08) * movingBonus * windowBonus * oneShotBonus * troopKillBonus * exposurePenalty * incomeUrgency * overpayPenalty * (1 + valueRatio * (safeMode ? 30 : 22)) / Math.sqrt(Math.max(density, 0.05));
                    if (score < minScore) continue;
                    if (score > bestScore) {
                        best = {
                            target: id,
                            percent: Math.max(0.02, Math.min(maxPercent, plannedSendTroops / Math.max(1, ownTroops))),
                            score,
                            oneShotRatio
                        };
                        bestScore = score;
                    }
                }
                return best || fallbackBest;
            };
            // Reachability-gated targeting, ported from genuine Project Messiah's micro()
            // (ThighClient/ProjectMessiah/MessiahCode.js 481-630, via
            // MessiahLatestPort/patches/messiah-ai.js + reachability.js's updateArrayToPoint).
            // What's kept vs. dropped from the original, and why:
            //  - KEPT: the BFS flood-fill reachability estimate itself -- a pure geometry
            //    calculation over MY tiles vs. a target's owned tiles, no opponent-internal state
            //    needed, so it is exactly as valid against a real (server-controlled) multiplayer
            //    bot as against a singleplayer one.
            //  - ADAPTED: the original enumerates the target's full owned-tile list
            //    (getAllTilesOf / cheat.getAllPixelsCoordinates) and floods into that fixed set.
            //    No binding for a per-player FULL tile list exists in this build (playerTiles/g.h7
            //    is BORDER tiles only -- see the comment on that binding above; the OmenClient
            //    predecessor's old gp/go full-tile names no longer resolve). Reimplemented as
            //    an ownership-checked flood fill instead (estimateBotReachableLand below): walk
            //    outward from tiles I border the target on, testing isOwnedTile+getTileOwner on
            //    each neighbor, stopping once landTotal (already known from playerTerritories,
            //    no enumeration needed) tiles are reached or the frontier stagnates twice running.
            //    Same terminating conditions as updateArrayToPoint, same reason (a target region
            //    split by water/third-party land is genuinely unreachable further, not slow).
            //  - DROPPED: botTiming/pending-attack-based delayed-attack scheduling. Both read the
            //    TARGET bot's own internal AI/attack state, which only exists client-side because
            //    Messiah's original engine ran singleplayer bots IN the client. In this engine's
            //    real multiplayer games (what this route is for), bot logic runs server-side and
            //    that state is not exposed to the client at all -- porting it would either no-op
            //    or read garbage. The existing autoAttackRecentTargets/automatedBotAttacks cooldown
            //    tracking (shared with every other mode here) already serves the same
            //    don't-re-target-what-I-just-attacked purpose.
            //  - REPLACED dosing: the original doses off a flat 2.7-2.8x reachableLand constant
            //    tuned for an older game version's defense math and ignores the target's own troop
            //    count entirely. This build's own oneShotRequired formula
            //    (2*(land+troops)/(253/256)) already bakes in the CURRENT engine's actual
            //    defense/attack-tax constant and the target's real garrison size -- strictly more
            //    accurate for this engine version than reproducing Messiah's older constant. Reused
            //    here with reachableLand/reachableTroops (both scaled by reachRatio) substituted for
            //    the target's full land/troops, which is the actual novel piece: dosing off what's
            //    reachable, not what's nominal.
            __fx.openingAutomation.estimateBotReachableLand=(entryTiles, botId, landTotal, budgetRounds)=> {
                if (!entryTiles || !entryTiles.length || landTotal <= 0) return { reachable: 0, rounds: 0, complete: false };
                var offsets = __fxAd?.${g.neighborOffsets};
                if (!offsets) return { reachable: landTotal, rounds: 0, complete: true };
                var reached = new Set();
                var frontier = entryTiles;
                var rounds = 0, stagnant = 0, budgetSnapshot;
                var MAX_ROUNDS = 300;
                while (reached.size < landTotal && rounds < MAX_ROUNDS) {
                    var toAdd = new Set();
                    for (var fi = 0; fi < frontier.length; fi++) {
                        var tile = frontier[fi];
                        for (var d = 0; d < 4; d++) {
                            var neighbor = tile + offsets[d];
                            if (reached.has(neighbor)) continue;
                            if (!__fxAd.${g.isOwnedTile}(neighbor)) continue;
                            if (__fxAd.${g.getTileOwner}(neighbor) !== botId) continue;
                            toAdd.add(neighbor);
                        }
                    }
                    if (toAdd.size === 0) {
                        stagnant++;
                        if (stagnant >= 2) break;
                    } else {
                        stagnant = 0;
                    }
                    toAdd.forEach((t)=> reached.add(t));
                    frontier = Array.from(toAdd);
                    rounds++;
                    if (rounds === budgetRounds) budgetSnapshot = reached.size;
                }
                return {
                    reachable: budgetSnapshot !== undefined ? budgetSnapshot : reached.size,
                    rounds: rounds,
                    complete: reached.size >= landTotal
                };
            };
            __fx.openingAutomation.findMessiahBotAttackTarget=(tick)=> {
                var player = ${dict.game}.${dict.playerId};
                var borderTiles = ${dict.playerData}.${g.playerTiles}?.[player];
                if (!borderTiles || !borderTiles.length) return null;
                var offsets = __fxAd?.${g.neighborOffsets};
                if (!offsets || typeof __fxAd.${g.isOwnedTile} !== "function" || typeof __fxAd.${g.getTileOwner} !== "function") return null;
                var humans = Number(${dict.game}.${dict.gHumans});
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                if (!isFinite(humans) || humans < 1) return null;
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[player] || 0;
                var ownLand = ${dict.playerData}.${dict.playerTerritories}[player] || 0;
                if (ownTroops <= 0 || ownLand <= 0) return null;

                // Group my own border tiles by which bot they touch -- mirrors Messiah's
                // borderPixelsWithEntity ("my tiles adjacent to that bot"), deduped so a bot with
                // several bordering tiles is scanned once, not once per tile.
                var entriesByBot = new Map();
                for (var i = borderTiles.length - 1; i >= 0; i--) {
                    var tile = borderTiles[i];
                    for (var d = 0; d < 4; d++) {
                        var neighbor = tile + offsets[d];
                        if (!__fxAd.${g.isOwnedTile}(neighbor)) continue;
                        var owner = __fxAd.${g.getTileOwner}(neighbor);
                        if (owner < __fxTargetStart(humans) || owner >= maxPlayers || owner === player) continue;
                        var entries = entriesByBot.get(owner);
                        if (!entries) { entries = []; entriesByBot.set(owner, entries); }
                        if (entries.indexOf(tile) < 0) entries.push(tile);
                    }
                }
                if (!entriesByBot.size) return null;

                var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                var activeTargets = __fx.openingAutomation.automatedBotAttacks;
                var maxAllowedDensity = 0.32;
                var minLand = ownLand < 10000 ? 180 : ownLand < 30000 ? 260 : ownLand < 60000 ? 500 : 700;
                var reserveRatio = 0.20;
                var taxTroops = Math.floor(ownTroops * 12 / 1024);
                var maxSendTroops = Math.max(0, ownTroops - ownTroops * reserveRatio - taxTroops);
                if (maxSendTroops < 1) return null;
                var BUDGET_ROUNDS = 10;

                var best = null;
                var bestScore = -1;
                entriesByBot.forEach((entryTiles, id)=> {
                    if (activeTargets?.has(id)) return;
                    if (recentTargets?.has(id) && tick - recentTargets.get(id) < 20) return;
                    var land = ${dict.playerData}.${dict.playerTerritories}[id] || 0;
                    if (land < minLand) return;
                    var troops = ${dict.playerData}.${dict.playerBalances}[id] || 0;
                    var density = land > 0 ? troops / (land * 150) * 100 : Infinity;
                    if (!isFinite(density) || density > maxAllowedDensity) return;

                    var reach = __fx.openingAutomation.estimateBotReachableLand(entryTiles, id, land, BUDGET_ROUNDS);
                    var reachableLand = Math.max(1, reach.reachable);
                    var reachRatio = reachableLand / land;
                    // Genuine Messiah gates on updatesNeeded[0] - updatesLeft (how badly a target
                    // overshoots the cycle) to skip severely-out-of-reach targets. There is no
                    // directly comparable tick budget here, but a low reachRatio after
                    // BUDGET_ROUNDS is the same underlying signal: most of the bot's land sits
                    // behind a choke point, or in a pocket this player's border doesn't actually
                    // touch -- exactly the "attacking a bot that looks big but gives a worse
                    // target" case this mode exists to avoid.
                    if (reachRatio < 0.35) return;

                    var reachableTroops = troops * reachRatio;
                    var killCost = 2 * (reachableLand + reachableTroops) / (253 / 256);
                    var desiredSend = killCost * 1.25;
                    var plannedSend = Math.min(desiredSend, maxSendTroops);
                    var oneShotRatio = plannedSend / Math.max(1, killCost);
                    if (oneShotRatio < 0.95) return;

                    var score = Math.pow(reachableLand, 1.1) * reachRatio / Math.sqrt(Math.max(density, 0.05));
                    if (score > bestScore) {
                        best = {
                            target: id,
                            percent: Math.max(0.02, Math.min(0.5, plannedSend / Math.max(1, ownTroops))),
                            score: score,
                            oneShotRatio: oneShotRatio,
                            reachRatio: reachRatio
                        };
                        bestScore = score;
                    }
                });
                return best;
            };
            __fx.openingAutomation.findThighClientBotAttackTarget=(tick)=> {
                __fx.openingAutomation.updateSafeBotDensityTracker();
                var playerId = ${dict.game}.${dict.playerId};
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[playerId];
                var ownLand = ${dict.playerData}.${dict.playerTerritories}[playerId];
                var tickInCycle = tick % 100;
                var reserveRatio = tickInCycle < 35 ? 0.44 : tickInCycle < 70 ? 0.26 : 0.18;
                var landCap = ownLand < 60000 ? 0.30 : ownLand < 90000 ? 0.15 : 0.10;
                var cycleCap = tickInCycle < 35 ? 0.26 : tickInCycle < 70 ? 0.38 : 0.42;
                var maxPercent = Math.min(cycleCap, landCap);
                var taxTroops = Math.floor(ownTroops * 12 / 1024);
                var maxSendTroops = Math.max(0, ownTroops - ownTroops * reserveRatio - taxTroops);
                maxSendTroops = Math.min(maxSendTroops, ownTroops * maxPercent);
                if (maxSendTroops < 1) return null;
                var minLand = ownLand < 10000 ? 250 : ownLand < 30000 ? 350 : ownLand < 60000 ? 650 : 900;
                var minScore = tickInCycle < 35
                    ? (ownLand < 60000 ? 750 : 1200)
                    : tickInCycle < 70
                        ? (ownLand < 60000 ? 1000 : 1550)
                        : tickInCycle < 86
                            ? (ownLand < 60000 ? 1550 : 2550)
                            : (ownLand < 60000 ? 2600 : 4200);
                var stockpilePressure = ownTroops / Math.max(1, ownLand);
                var tracker = __fx.openingAutomation.safeBotDensityTracker ||= new Map();
                var best = null;
                var bestScore = -1;
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (land <= 0 || land < minLand) continue;
                    if (id === playerId || !__fxBorders(id, playerId) || !__fxCanAttack(playerId, id)) continue;
                    var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                    if (recentTargets?.has(id) && tick - recentTargets.get(id) < 30) continue;
                    var troops = ${dict.playerData}.${dict.playerBalances}[id];
                    var density = land > 0 ? troops / (land * 150) * 100 : Infinity;
                    if (!isFinite(density) || density > 0.26) continue;
                    var record = tracker.get(id);
                    var attackTarget = __fx.openingAutomation.inferBotAttackTarget(id);
                    var landGrowthAge = record?.landGrowthTick !== undefined ? tick - record.landGrowthTick : Infinity;
                    var lowDensityAge = record?.rawLowDensityTick !== undefined ? tick - record.rawLowDensityTick : Infinity;
                    var targetIsSizeable = attackTarget && (attackTarget.land >= 300 || attackTarget.land >= land * 0.08);
                    var movingWindow = targetIsSizeable && landGrowthAge <= 35;
                    var freshLowDensity = lowDensityAge <= 18;
                    var earlyStationaryException = ownLand < 15000 && density <= 0.08 && land >= 300 && freshLowDensity;
                    var earlyFallbackException = ownLand >= 12000 && ownLand < 24000 && tick < 1000 && density <= 0.2 && land >= 350;
                    var stationaryException = density <= 0.09 && land >= 2000 && freshLowDensity;
                    var stockpileException = stockpilePressure >= 0.9 && density <= 0.08 && land >= 2400;
                    if (stockpilePressure >= 1.15 && density <= 0.09 && land >= 3800) stockpileException = true;
                    if (tickInCycle >= 86 && !(movingWindow || stockpileException || (freshLowDensity && density <= 0.12 && land >= 900))) continue;
                    if (!movingWindow && !earlyStationaryException && !earlyFallbackException && !stationaryException && !stockpileException) continue;
                    var oneShotRequired = 2 * (land + troops) / (253 / 256);
                    var desiredSendTroops = oneShotRequired * (movingWindow ? 1.18 : (earlyFallbackException ? 1.22 : 1.28));
                    var plannedSendTroops = Math.min(desiredSendTroops, maxSendTroops);
                    var oneShotRatio = plannedSendTroops / Math.max(1, oneShotRequired);
                    var troopKillRatio = plannedSendTroops / Math.max(1, troops * 2.8);
                    var efficientOneShot = oneShotRatio >= (movingWindow ? 1.1 : (earlyFallbackException ? 1.20 : 1.2)) && oneShotRatio <= 1.8;
                    if (tickInCycle >= 86 && oneShotRatio < 1.24) efficientOneShot = false;
                    if (!efficientOneShot) continue;
                    var exposure = __fx.openingAutomation.getBotExposure(id);
                    var exposurePenalty = 1 / (1 + Math.max(0, exposure.botNeighbors - 2) * 0.12);
                    var movingBonus = movingWindow ? 2.4 : (earlyFallbackException ? 1.7 : (stockpileException ? 1.35 : 1));
                    var windowBonus = attackTarget ? 1 + Math.min(1.5, Math.sqrt(Math.max(1, attackTarget.land)) / 65) : 1;
                    var oneShotBonus = oneShotRatio >= 1 ? 2.4 + Math.min(0.8, oneShotRatio - 1) : 0.9;
                    var troopKillBonus = Math.min(1.4, Math.max(0.7, troopKillRatio));
                    var valueRatio = land / Math.max(1, oneShotRequired);
                    var incomeUrgency = tickInCycle <= 70 ? 1 + (70 - tickInCycle) / 140 : 1;
                    var overpayPenalty = oneShotRatio > 1 ? 1 / (1 + Math.max(0, oneShotRatio - 1.25) * 0.45) : 1;
                    var lateFinishBonus = tickInCycle >= 86 ? (movingWindow ? 1.25 : 0.78) : 1;
                    var score = Math.pow(land, 1.18) * movingBonus * windowBonus * oneShotBonus * troopKillBonus * exposurePenalty * incomeUrgency * overpayPenalty * lateFinishBonus * (1 + valueRatio * 30) / Math.sqrt(Math.max(density, 0.05));
                    if (score < minScore) continue;
                    if (score > bestScore) {
                        best = {
                            target: id,
                            percent: Math.max(0.02, Math.min(maxPercent, plannedSendTroops / Math.max(1, ownTroops))),
                            score,
                            oneShotRatio
                        };
                        bestScore = score;
                    }
                }
                return best;
            };
            __fx.openingAutomation.findSimpleBestBotAttackTarget=(tick)=> {
                var playerId = ${dict.game}.${dict.playerId};
                var humans = Number(${dict.game}.${dict.gHumans});
                var maxPlayers = ${dict.game}.${dict.gLobbyMaxJoin} || 512;
                if (!isFinite(humans) || humans < 1) return -1;
                var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                var best = -1;
                var bestScore = -1;
                for (var id = __fxTargetStart(humans); id < maxPlayers; id++) {
                    if (id === playerId) continue;
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (!land || land <= 0) continue;
                    if (!__fxCanAttack(playerId, id)) continue;
                    if (recentTargets?.has(id) && tick - recentTargets.get(id) < 40) continue;
                    var troops = ${dict.playerData}.${dict.playerBalances}[id];
                    var density = land > 0 ? troops / (land * 150) * 100 : Infinity;
                    if (!isFinite(density) || density > 0.45) continue;
                    var score = Math.pow(land, 1.35) / Math.sqrt(Math.max(density, 0.03));
                    if (score > bestScore) {
                        best = id;
                        bestScore = score;
                    }
                }
                if (best >= 0) return best;
                for (var fallbackId = __fxTargetStart(humans); fallbackId < maxPlayers; fallbackId++) {
                    if (fallbackId === playerId) continue;
                    var fallbackLand = ${dict.playerData}.${dict.playerTerritories}[fallbackId];
                    if (!fallbackLand || fallbackLand <= 0) continue;
                    if (!__fxCanAttack(playerId, fallbackId)) continue;
                    if (recentTargets?.has(fallbackId) && tick - recentTargets.get(fallbackId) < 15) continue;
                    var fallbackTroops = ${dict.playerData}.${dict.playerBalances}[fallbackId];
                    var fallbackDensity = fallbackLand > 0 ? fallbackTroops / (fallbackLand * 150) * 100 : Infinity;
                    if (!isFinite(fallbackDensity)) continue;
                    var fallbackScore = Math.pow(fallbackLand, 1.2) / Math.sqrt(Math.max(fallbackDensity, 0.03));
                    if (fallbackScore > bestScore) {
                        best = fallbackId;
                        bestScore = fallbackScore;
                    }
                }
                return best;
            };
            __fx.openingAutomation.findFullsendEncapsulatedBot=(attackPercent, mode)=> {
                var conservativeMode = mode === "safe";
                var playerId = ${dict.game}.${dict.playerId};
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[playerId];
                var now = performance.now();
                var stats = { type: "safe-check", kind: "reserved", considered: 0, lowDensity: 0, rejectKill: 0, selected: false };
                var isEncapsulatedBot = (botId)=> {
                    var botTiles = ${dict.playerData}.gp?.[botId] || ${dict.playerData}.go?.[botId] || [];
                    var offsets = __fxOffsets();
                    var touchesUs = false;
                    if (!botTiles.length || offsets.length < 4) return false;
                    for (var tileIndex = botTiles.length - 1; tileIndex >= 0; tileIndex--) {
                        var tile = botTiles[tileIndex];
                        for (var offsetIndex = 3; offsetIndex >= 0; offsetIndex--) {
                            var neighbor = tile + offsets[offsetIndex];
                            if (__fxTileNeutral(neighbor)) return false;
                            if (!__fxTileOwned(neighbor)) continue;
                            var owner = __fxTileOwner(neighbor);
                            if (owner === botId) continue;
                            if (owner !== playerId) return false;
                            touchesUs = true;
                        }
                    }
                    return touchesUs;
                };
                var best = -1, bestScore = -1;
                var bestInfo = null;
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (land <= 0) continue;
                    if (id === playerId || !__fxBorders(id, playerId) || !__fxCanAttack(playerId, id)) continue;
                    if (!isEncapsulatedBot(id)) continue;
                    var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                    if (recentTargets?.has(id) && now - recentTargets.get(id) < 5000) continue;
                    stats.considered++;
                    var botTroops = ${dict.playerData}.${dict.playerBalances}[id];
                    var density = botTroops / (land * 150);
                    if (density >= 0.3) continue;
                    stats.lowDensity++;
                    var estimatedKillCost = botTroops * 2;
                    var minSendPercent = estimatedKillCost / Math.max(1, ownTroops);
                    var recommendedSendPercent = Math.min(conservativeMode ? 0.12 : 0.50, Math.max(0.05, minSendPercent * 1.1));
                    var actualSendTroops = ownTroops * recommendedSendPercent;
                    var fullKillRatio = actualSendTroops / Math.max(1, estimatedKillCost);
                    if (fullKillRatio < 0.7) {
                        stats.rejectKill++;
                        continue;
                    }
                    var score = (land * land) / Math.max(1, estimatedKillCost);
                    if (score > bestScore) {
                        best = id;
                        bestScore = score;
                        bestInfo = { id, land, density, fullKillRatio, estimatedKillCost, recommendedSendPercent, score };
                    }
                }
                if (bestInfo) {
                    stats.selected = true;
                    stats.target = bestInfo;
                }
                __fx.openingAutomation.lastSafeReservedSelection = bestInfo;
                __fx.openingAutomation.recordSafeTelemetry(stats);
                return best;
            };
            __fx.openingAutomation.findBestLowDensityBorderingBot=(cycleProgress, mode, attackPercent, excludeEncapsulated)=> {
                cycleProgress = Math.max(0, Math.min(0.99, Number(cycleProgress) || 0));
                var playerId = ${dict.game}.${dict.playerId};
                var now = performance.now();
                var safeMode = mode === "safe" || mode === "best";
                var conservativeMode = mode === "safe";
                var rawMode = mode === "raw";
                if (!safeMode) __fx.openingAutomation.updateSafeBotDensityTracker();
                var ownTroops = ${dict.playerData}.${dict.playerBalances}[playerId];
                var sendPercent = Number(attackPercent);
                if (!isFinite(sendPercent) || sendPercent <= 0) sendPercent = Number(__fx.keybindFunctions.getAttackPercentage?.() || 0);
                var sendTroops = ownTroops * sendPercent;
                var tracker = safeMode ? null : (__fx.openingAutomation.safeBotDensityTracker ||= new Map());
                var minKillRatio = safeMode ? 0 : (cycleProgress >= 0.65 ? 0.7 : 0.45);
                var stats = safeMode ? { type: "safe-check", kind: "normal", cycleProgress, considered: 0, rejectKill: 0, selected: false } : null;
                var fallbackBest = -1, fallbackScore = -1, fallbackInfo = null;
                var isEncapsulatedBot = (botId)=> {
                    var botTiles = ${dict.playerData}.gp?.[botId] || ${dict.playerData}.go?.[botId] || [];
                    var offsets = __fxOffsets();
                    var touchesUs = false;
                    if (!botTiles.length || offsets.length < 4) return false;
                    for (var tileIndex = botTiles.length - 1; tileIndex >= 0; tileIndex--) {
                        var tile = botTiles[tileIndex];
                        for (var offsetIndex = 3; offsetIndex >= 0; offsetIndex--) {
                            var neighbor = tile + offsets[offsetIndex];
                            if (__fxTileNeutral(neighbor)) return false;
                            if (!__fxTileOwned(neighbor)) continue;
                            var owner = __fxTileOwner(neighbor);
                            if (owner === botId) continue;
                            if (owner !== playerId) return false;
                            touchesUs = true;
                        }
                    }
                    return touchesUs;
                };
                var best = -1, bestScore = -1;
                var bestInfo = null;
                for (var id = __fxTargetStart(${dict.game}.${dict.gHumans}); id < ${dict.game}.${dict.gLobbyMaxJoin}; id++) {
                    var land = ${dict.playerData}.${dict.playerTerritories}[id];
                    if (land <= 0) continue;
                    if (id === playerId || !__fxBorders(id, playerId) || !__fxCanAttack(playerId, id)) continue;
                    var botTroops = ${dict.playerData}.${dict.playerBalances}[id];
                    var encapsulated = isEncapsulatedBot(id);
                    if (excludeEncapsulated && encapsulated) continue;
                    var density = botTroops / (land * 150);
                    var score;
                    if (safeMode) {
                        var recentTargets = __fx.openingAutomation.autoAttackRecentTargets;
                        if (recentTargets?.has(id) && now - recentTargets.get(id) < 5000) continue;
                        stats.considered++;
                        // Only attack bots with very low troop density — they have almost no troops to defend
                        var safeDensity = botTroops / Math.max(1, land * 100);
                        var densityThreshold = land >= 3000 ? 0.05 : land >= 2000 ? 0.04 : land >= 1000 ? 0.03 : 0.02;
                        if (safeDensity > densityThreshold) { stats.rejectDensity = (stats.rejectDensity || 0) + 1; continue; }
                        var killCost = botTroops * 2;
                        var minSendPercent = killCost / Math.max(1, ownTroops);
                        var recommendedSendPercent = Math.min(conservativeMode ? 0.12 : 0.50, Math.max(0.05, minSendPercent * 1.6));
                        var actualSendTroops = ownTroops * recommendedSendPercent;
                        var requiredKillRatio = encapsulated ? 0.7 : 1.0;
                        var fullKillRatio = actualSendTroops / Math.max(1, killCost);
                        if (fullKillRatio < requiredKillRatio) { stats.rejectKill++; continue; }
                        score = (land * land) / Math.max(1, killCost);
                        if (encapsulated) score *= 2;
                        if (score > bestScore) {
                            best = id; bestScore = score;
                            bestInfo = { id, land, safeDensity: safeDensity.toFixed(4), killCost, fullKillRatio, recommendedSendPercent, score };
                        }
                    } else if (rawMode) {
                        var recentRawTargets = __fx.openingAutomation.autoAttackRecentTargets;
                        if (recentRawTargets?.has(id) && __fx.openingAutomation.lastTick - recentRawTargets.get(id) < 30) continue;
                        var rawDensity = density * 100;
                        if (!isFinite(rawDensity) || rawDensity > 0.3) continue;
                        var rawRecord = tracker.get(id);
                        var rawAttackTarget = __fx.openingAutomation.inferBotAttackTarget(id);
                        var rawLandGrowthAge = rawRecord?.landGrowthTick !== undefined ? __fx.openingAutomation.lastTick - rawRecord.landGrowthTick : Infinity;
                        var rawLowDensityAge = rawRecord?.rawLowDensityTick !== undefined ? __fx.openingAutomation.lastTick - rawRecord.rawLowDensityTick : Infinity;
                        var rawTargetIsSizeable = rawAttackTarget && (rawAttackTarget.land >= 300 || rawAttackTarget.land >= land * 0.08);
                        var rawMovingWindow = rawTargetIsSizeable && rawLandGrowthAge <= 35;
                        var rawFreshLowDensity = rawLowDensityAge <= 18;
                        var rawStationaryException = rawDensity <= 0.1 && land >= 1800 && rawFreshLowDensity;
                        if (!rawMovingWindow && !rawStationaryException) continue;
                        var rawKillRatio = sendTroops / Math.max(1, botTroops * 2);
                        if (rawKillRatio < (rawMovingWindow ? 0.2 : 0.45)) continue;
                        var rawExposure = __fx.openingAutomation.getBotExposure(id);
                        var rawExposurePenalty = 1 / (1 + Math.max(0, rawExposure.botNeighbors - 2) * 0.12);
                        var rawMovingBonus = rawMovingWindow ? 2.4 : 1;
                        var rawWindowBonus = rawAttackTarget ? 1 + Math.min(1.5, Math.sqrt(Math.max(1, rawAttackTarget.land)) / 65) : 1;
                        var rawKillBonus = Math.min(1.7, Math.max(0.35, rawKillRatio));
                        var rawDensityFloor = Math.max(rawDensity, 0.05);
                        score = Math.pow(land, 1.08) * rawMovingBonus * rawWindowBonus * rawKillBonus * rawExposurePenalty / Math.sqrt(rawDensityFloor);
                        if (score > bestScore) {
                            best = id; bestScore = score;
                            bestInfo = {
                                id,
                                land,
                                density: Number(rawDensity.toFixed(4)),
                                score,
                                moving: rawMovingWindow,
                                lowDensityAge: isFinite(rawLowDensityAge) ? Math.round(rawLowDensityAge) : null,
                                landGrowthAge: isFinite(rawLandGrowthAge) ? Math.round(rawLandGrowthAge) : null,
                                attackTarget: rawAttackTarget,
                                killRatio: rawKillRatio,
                                exposure: rawExposure
                            };
                        }
                    } else {
                        // Best mode: density threshold + freshness filter + original score formula
                        if (density > 0.2) continue;
                        var record = tracker.get(id);
                        var age = record?.fullsendAt ? Math.round(now - record.fullsendAt) : null;
                        var landGrowthAge = record?.landGrowthAt ? Math.round(now - record.landGrowthAt) : null;
                        var attackTarget = __fx.openingAutomation.inferBotAttackTarget(id);
                        var maxFreshAge = density <= 0.12 ? 1400 : 1000;
                        var targetIsSizeable = attackTarget && (attackTarget.land >= 300 || attackTarget.land >= land * 0.08);
                        var recentlyGrowing = landGrowthAge !== null && landGrowthAge <= 1400 && targetIsSizeable;
                        var recentlyDropped = age !== null && age <= maxFreshAge;
                        if (!record || (!recentlyGrowing && !recentlyDropped)) continue;
                        density = Math.max(density, 0.001);
                        var killRatio = sendTroops / Math.max(1, botTroops * 2);
                        var reqKillRatio = encapsulated ? Math.max(0.35, minKillRatio - 0.15) : minKillRatio;
                        if (killRatio < reqKillRatio) continue;
                        score = Math.pow(land, 1.1) / Math.pow(density, 1.4) * Math.pow(Math.min(killRatio, 1.6), 2.5);
                        if (attackTarget) score *= 1 + Math.min(1.5, Math.sqrt(Math.max(1, attackTarget.land)) / 60);
                        if (encapsulated) score *= killRatio >= 1 ? 8 : 4;
                        if (score > bestScore) {
                            best = id; bestScore = score;
                            bestInfo = { id, land, density, killRatio, reqKillRatio, age, landGrowthAge, attackTarget, score };
                        }
                    }
                }
                if (rawMode && best === -1 && fallbackBest !== -1) { best = fallbackBest; bestInfo = fallbackInfo; }
                if (safeMode) {
                    if (bestInfo) { stats.selected = true; stats.target = bestInfo; }
                    __fx.openingAutomation.lastSafeNormalSelection = bestInfo;
                    __fx.openingAutomation.recordSafeTelemetry(stats);
                }
                return best;
            };
            __fx.openingAutomation.findLowDensityBorderingBot=()=> __fx.openingAutomation.findLowDensityBorderingBots(1)[0] ?? -1;
            if (typeof window !== "undefined" && !window.__gcAutomationHooks) {
                window.__gcAutomationHooks = true;
                console.log("[gc] automation hooks installed: mapData=" + (typeof __fxAd) + " attackManager=" + (typeof ${g.attackManager}) + " protocolHandler=" + (typeof ${g.protocolHandler}) + " teamUtils=" + (typeof ${g.teamUtils}));
            }
            $2`;

  replaceOne(
    /(function \w+\(\)\{)(var \w+=0,\w+=0;this\.\w+=function\(\w+,\w+\)\{)/g,
    openingAutomationInjection
  );

  replaceOne(
    /(this\.\w+=function\(\)\{this\.(\w+)\.(\w+)\+\+)(\})/g,
    "$1,__fx.openingAutomation.onTick(this.$2.$3),__fx.openingAutomation.onTickAutoAttack(this.$2.$3)$4"
  );

  console.log("Opening automation hooks injected (g table: " + Object.keys(g).length + " names)");
}
