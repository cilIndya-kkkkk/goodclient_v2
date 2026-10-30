import { getVar } from "./gameInterface.js";
import { t } from "./i18n.js";

const MAIN_PLAYER_KEY = "fx_hoard_main_player_name";
const HOARD_DENSITY = 130;
const ATTACK_DENSITY = 100;
const SUPPORT_PERCENT = 0.1;
const ATTACK_PERCENT = 0.09;
const SHIP_PERCENT = 0.04;
const COMMAND_INTERVAL_MS = 6000;
const TICK_INTERVAL_MS = 1000;

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function initBotCommander() {
  let selectionMode = null;
  let activeMode = null;
  let looping = false;
  let timer = null;
  let saved = null;
  let lastCommandAt = 0;
  let lastCommandOk = null;
  let lastSelectAt = 0;
  let mainPlayerName = localStorage.getItem(MAIN_PLAYER_KEY) || "";
  let mainPlayerId = -1;
  let attackTargetId = -1;
  let attackTargetName = "";
  let pendingTargetId = -1;
  let pendingTargetName = "";
  let commandButton = null;
  let hint = null;

  function gameReady() {
    const state = asNumber(getVar("gameState"));
    return (state === 1 || state === 2) && !getVar("gIsReplay");
  }

  function ownPlayerId() {
    return asNumber(getVar("playerId"));
  }

  function maxPlayers() {
    return asNumber(getVar("gLobbyMaxJoin")) || 512;
  }

  function playerNames() {
    return getVar("rawPlayerNames") || [];
  }

  function playerLand() {
    return getVar("playerTerritories") || [];
  }

  function playerTroops() {
    return getVar("playerBalances") || [];
  }

  function getPlayerList() {
    const names = playerNames();
    const land = playerLand();
    const troops = playerTroops();
    const self = ownPlayerId();
    const count = Math.min(maxPlayers(), names.length);
    const result = [];
    for (let id = 0; id < count; id++) {
      if (id === self) continue;
      const territory = asNumber(land[id]);
      if (territory <= 0) continue;
      const name = String(names[id] || "");
      if (!name) continue;
      const balance = asNumber(troops[id]);
      result.push({
        id,
        name,
        land: territory,
        troops: balance,
        density: balance / territory,
      });
    }
    result.sort((left, right) => left.name.localeCompare(right.name));
    return result;
  }

  function resolveMainPlayer() {
    if (!gameReady()) return -1;
    const list = getPlayerList();
    if (mainPlayerId >= 0) {
      const current = list.find((player) => player.id === mainPlayerId);
      if (current && (!mainPlayerName || current.name === mainPlayerName)) return mainPlayerId;
    }
    if (mainPlayerName) {
      const exact = list.find((player) => player.name === mainPlayerName);
      const loose = exact || list.find((player) => player.name.toLowerCase() === mainPlayerName.toLowerCase());
      if (loose) {
        mainPlayerId = loose.id;
        return mainPlayerId;
      }
    }
    mainPlayerId = -1;
    return -1;
  }

  function setMainPlayer(target) {
    if (target === null || target === undefined || target === "") {
      mainPlayerName = "";
      mainPlayerId = -1;
      localStorage.removeItem(MAIN_PLAYER_KEY);
      return;
    }
    if (typeof target === "object") {
      mainPlayerName = String(target.name || "");
      mainPlayerId = asNumber(target.id);
    } else {
      const numeric = Number(target);
      if (Number.isFinite(numeric)) {
        const player = getPlayerList().find((item) => item.id === numeric);
        mainPlayerName = player ? player.name : "";
        mainPlayerId = player ? player.id : -1;
      } else {
        mainPlayerName = String(target);
        mainPlayerId = -1;
      }
    }
    if (mainPlayerName) localStorage.setItem(MAIN_PLAYER_KEY, mainPlayerName);
    else localStorage.removeItem(MAIN_PLAYER_KEY);
  }

  function currentStats() {
    const player = ownPlayerId();
    const land = asNumber(playerLand()[player]);
    const troops = asNumber(playerTroops()[player]);
    return {
      player,
      land,
      troops,
      density: land > 0 ? troops / land : 0,
    };
  }

  function automation() {
    return window.__fx && window.__fx.openingAutomation ? window.__fx.openingAutomation : null;
  }

  function canSupport(target) {
    const api = automation();
    return Boolean(api && typeof api.canSupport === "function" && api.canSupport(target));
  }

  function maxSupportPercent(target) {
    const api = automation();
    if (!api || typeof api.getMaxSupportPercent !== "function") return 0;
    return Math.max(0, Math.min(1, asNumber(api.getMaxSupportPercent(target))));
  }

  function canAttackTarget(target) {
    const api = automation();
    return Boolean(api && typeof api.canAttackTarget === "function" && api.canAttackTarget(target));
  }

  function donateOnce(target) {
    const api = automation();
    if (!api || typeof api.sendSupport !== "function") return false;
    lastCommandAt = Date.now();
    lastCommandOk = null;
    const maxPercent = maxSupportPercent(target);
    if (maxPercent <= 0) return false;
    const percent = Math.min(SUPPORT_PERCENT, maxPercent);
    lastCommandOk = Boolean(api.sendSupport(target, percent));
    return lastCommandOk;
  }

  function attackOnce(target) {
    const api = automation();
    if (!api || typeof api.attackPlayerTarget !== "function" || !canAttackTarget(target)) return false;
    lastCommandAt = Date.now();
    lastCommandOk = Boolean(api.attackPlayerTarget(target, ATTACK_PERCENT));
    return lastCommandOk;
  }

  function tick() {
    if (!activeMode || !looping || !gameReady()) return;
    if (Date.now() - lastCommandAt < COMMAND_INTERVAL_MS) return;
    const stats = currentStats();
    if (activeMode === "hoard") {
      if (stats.density < HOARD_DENSITY) return;
      const target = resolveMainPlayer();
      if (target < 0) return;
      donateOnce(target);
    } else if (activeMode === "attack") {
      if (stats.density < ATTACK_DENSITY) return;
      if (attackTargetId < 0 || !canAttackTarget(attackTargetId)) return;
      attackOnce(attackTargetId);
    }
  }

  function startLoop() {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(tick, TICK_INTERVAL_MS);
  }

  function stopLoop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function beginMode(mode) {
    const api = automation();
    if (!api) return false;
    if (activeMode) endMode();
    const settings = window.__fx.settings || {};
    saved = {
      opening: Boolean(settings.openingAutomationEnabled),
      infinite: Boolean(settings.infiniteExpansionEnabled),
      mode: api.getAutoAttackMode(),
    };
    api.setAllAutomationEnabled(false);
    activeMode = mode;
    looping = false;
    lastCommandAt = 0;
    lastCommandOk = null;
    return true;
  }

  function endMode() {
    if (!activeMode) return false;
    const previous = activeMode;
    const api = automation();
    if (previous === "attack" && attackTargetId >= 0 && api && typeof api.cancelPlayerAttack === "function") {
      api.cancelPlayerAttack(attackTargetId);
    }
    activeMode = null;
    looping = false;
    stopLoop();
    if (saved && api) {
      api.setOpeningAutomationEnabled(saved.opening);
      api.setInfiniteExpansionEnabled(saved.infinite);
      api.setAutoAttackMode(saved.mode);
      saved = null;
    }
    if (previous === "attack") {
      attackTargetId = -1;
      attackTargetName = "";
    }
    return true;
  }

  function uiHost() {
    return document.getElementById("windowContainer") || document.body;
  }

  function ensureUi() {
    if (!commandButton) {
      commandButton = document.createElement("button");
      commandButton.type = "button";
      commandButton.id = "fxBotDonateTarget";
      commandButton.addEventListener("click", (event) => {
        event.stopPropagation();
        confirmSelection();
      });
      uiHost().appendChild(commandButton);
    }
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "fxBotHoardHint";
      uiHost().appendChild(hint);
    }
  }

  function showCommandButton(x, y, mode) {
    ensureUi();
    commandButton.textContent = mode === "attack" ? t("Attack") : t("Donate");
    commandButton.classList.toggle("attack", mode === "attack");
    commandButton.style.left = `${Math.round(x)}px`;
    commandButton.style.top = `${Math.round(Math.max(8, y - 42))}px`;
    commandButton.style.display = "block";
    hint.style.display = "none";
  }

  function hideCommandButton() {
    if (commandButton) commandButton.style.display = "none";
  }

  function showHint(mode) {
    ensureUi();
    hint.textContent = mode === "attack" ? t("Click an enemy on the map")
      : mode === "boat" ? t("Click a boat target on the map")
      : t("Click a teammate on the map");
    hint.style.display = "block";
    hideCommandButton();
  }

  function hideHint() {
    if (hint) hint.style.display = "none";
  }

  function selectAt(clientX, clientY) {
    if (!selectionMode) return;
    const now = Date.now();
    if (now - lastSelectAt < 300) return;
    lastSelectAt = now;
    if (selectionMode === "boat") {
      const launch = window.__fx && window.__fx.botMap && window.__fx.botMap.launchShipAt;
      if (typeof launch === "function") launch(clientX, clientY, SHIP_PERCENT);
      cancelSelection();
      return;
    }
    const playerAt = window.__fx && window.__fx.botMap && window.__fx.botMap.playerAt;
    if (typeof playerAt !== "function") return;
    const target = Number(playerAt(clientX, clientY));
    const valid = Number.isFinite(target) && target >= 0 && target !== ownPlayerId()
      && (selectionMode === "attack" ? canAttackTarget(target) : canSupport(target));
    if (!valid) {
      pendingTargetId = -1;
      pendingTargetName = "";
      hideCommandButton();
      return;
    }
    const player = getPlayerList().find((item) => item.id === target);
    pendingTargetId = target;
    pendingTargetName = player ? player.name : String(playerNames()[target] || "");
    showCommandButton(clientX, clientY, selectionMode);
  }

  function pointerSelect(event) {
    if (!selectionMode) return;
    if (event.button !== undefined && event.button !== 0) return;
    selectAt(event.clientX, event.clientY);
  }

  function touchSelect(event) {
    if (!selectionMode) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch) selectAt(touch.clientX, touch.clientY);
  }

  function startSelection(mode = "hoard") {
    if (!gameReady()) return false;
    if (mode !== "boat" && activeMode) endMode();
    cancelSelection();
    selectionMode = mode === "attack" ? "attack" : mode === "boat" ? "boat" : "hoard";
    pendingTargetId = -1;
    pendingTargetName = "";
    showHint(selectionMode);
    return true;
  }

  function cancelSelection() {
    selectionMode = null;
    pendingTargetId = -1;
    pendingTargetName = "";
    hideCommandButton();
    hideHint();
  }

  function confirmSelection() {
    if (!selectionMode || pendingTargetId < 0) return false;
    const mode = selectionMode;
    const target = pendingTargetId;
    const targetName = pendingTargetName;
    const stats = currentStats();
    cancelSelection();

    if (mode === "hoard") {
      setMainPlayer({ id: target, name: targetName });
      if (!beginMode("hoard")) return false;
      const donated = donateOnce(target);
      if (stats.density >= HOARD_DENSITY) {
        looping = true;
        startLoop();
      } else {
        looping = false;
        stopLoop();
      }
      return donated;
    }

    attackTargetId = target;
    attackTargetName = targetName;
    if (!beginMode("attack")) return false;
    const attacked = attackOnce(target);
    if (stats.density >= ATTACK_DENSITY) {
      looping = true;
      startLoop();
    } else {
      looping = false;
      stopLoop();
    }
    return attacked;
  }

  function stopMode() {
    if (!activeMode && !selectionMode) return false;
    endMode();
    cancelSelection();
    return true;
  }

  function getState() {
    const stats = currentStats();
    const target = resolveMainPlayer();
    return {
      selecting: Boolean(selectionMode),
      selectionMode,
      mode: activeMode,
      enabled: activeMode === "hoard",
      attackEnabled: activeMode === "attack",
      looping,
      density: stats.density,
      troops: stats.troops,
      land: stats.land,
      mainPlayerId: target,
      mainPlayerName: mainPlayerName || "",
      attackTargetId,
      attackTargetName,
      pendingTargetName,
      hoardThreshold: HOARD_DENSITY,
      attackThreshold: ATTACK_DENSITY,
      supportPercent: SUPPORT_PERCENT,
      attackPercent: ATTACK_PERCENT,
      shipPercent: SHIP_PERCENT,
      lastCommandAt,
      lastCommandOk,
    };
  }

  ensureUi();
  const canvas = document.getElementById("canvasA");
  if (canvas) {
    canvas.addEventListener("pointerdown", pointerSelect, true);
    canvas.addEventListener("touchend", touchSelect, true);
  }

  return {
    startSelection,
    cancelSelection,
    confirmSelection,
    stopMode,
    stopHoard: stopMode,
    setMainPlayer,
    getMainPlayer: () => ({ id: resolveMainPlayer(), name: mainPlayerName || "" }),
    getPlayerList,
    getState,
  };
}
