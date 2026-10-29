import { getVar } from "./gameInterface.js";
import { t } from "./i18n.js";

const MAIN_PLAYER_KEY = "fx_hoard_main_player_name";
const DENSITY_THRESHOLD = 130;
const SUPPORT_PERCENT = 0.1;
const SUPPORT_INTERVAL_MS = 6000;
const TICK_INTERVAL_MS = 1000;

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function initBotCommander() {
  let selecting = false;
  let enabled = false;
  let looping = false;
  let timer = null;
  let saved = null;
  let lastSupportAt = 0;
  let lastSupportOk = null;
  let lastSelectAt = 0;
  let mainPlayerName = localStorage.getItem(MAIN_PLAYER_KEY) || "";
  let mainPlayerId = -1;
  let pendingTargetId = -1;
  let pendingTargetName = "";
  let donateButton = null;
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

  function donateOnce(target) {
    const api = automation();
    if (!api || typeof api.sendSupport !== "function") return false;
    lastSupportAt = Date.now();
    lastSupportOk = null;
    const maxPercent = maxSupportPercent(target);
    if (maxPercent <= 0) return false;
    const percent = Math.min(SUPPORT_PERCENT, maxPercent);
    lastSupportOk = Boolean(api.sendSupport(target, percent));
    return lastSupportOk;
  }

  function tick() {
    if (!enabled || !looping || !gameReady()) return;
    if (Date.now() - lastSupportAt < SUPPORT_INTERVAL_MS) return;
    const stats = currentStats();
    if (stats.density < DENSITY_THRESHOLD) return;
    const target = resolveMainPlayer();
    if (target < 0) return;
    donateOnce(target);
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

  function uiHost() {
    return document.getElementById("windowContainer") || document.body;
  }

  function ensureUi() {
    if (!donateButton) {
      donateButton = document.createElement("button");
      donateButton.type = "button";
      donateButton.id = "fxBotDonateTarget";
      donateButton.textContent = t("Donate");
      donateButton.addEventListener("click", (event) => {
        event.stopPropagation();
        confirmSelection();
      });
      uiHost().appendChild(donateButton);
    }
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "fxBotHoardHint";
      hint.textContent = t("Click a teammate on the map");
      uiHost().appendChild(hint);
    }
  }

  function positionDonateButton(x, y) {
    ensureUi();
    donateButton.style.left = `${Math.round(x)}px`;
    donateButton.style.top = `${Math.round(Math.max(8, y - 42))}px`;
  }

  function showDonateButton(x, y) {
    ensureUi();
    positionDonateButton(x, y);
    donateButton.style.display = "block";
    hint.style.display = "none";
  }

  function hideDonateButton() {
    if (donateButton) donateButton.style.display = "none";
  }

  function showHint() {
    ensureUi();
    hint.style.display = "block";
    hideDonateButton();
  }

  function hideHint() {
    if (hint) hint.style.display = "none";
  }

  function selectAt(clientX, clientY) {
    if (!selecting) return;
    const now = Date.now();
    if (now - lastSelectAt < 300) return;
    lastSelectAt = now;
    const playerAt = window.__fx && window.__fx.botMap && window.__fx.botMap.playerAt;
    if (typeof playerAt !== "function") return;
    const target = Number(playerAt(clientX, clientY));
    if (!Number.isFinite(target) || target < 0 || target === ownPlayerId() || !canSupport(target)) {
      pendingTargetId = -1;
      pendingTargetName = "";
      hideDonateButton();
      return;
    }
    const player = getPlayerList().find((item) => item.id === target);
    pendingTargetId = target;
    pendingTargetName = player ? player.name : String(playerNames()[target] || "");
    showDonateButton(clientX, clientY);
  }

  function pointerSelect(event) {
    if (!selecting) return;
    if (event.button !== undefined && event.button !== 0) return;
    selectAt(event.clientX, event.clientY);
  }

  function touchSelect(event) {
    if (!selecting) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch) selectAt(touch.clientX, touch.clientY);
  }

  function startSelection() {
    if (enabled || selecting) return false;
    if (!gameReady()) return false;
    selecting = true;
    pendingTargetId = -1;
    pendingTargetName = "";
    showHint();
    return true;
  }

  function cancelSelection() {
    selecting = false;
    pendingTargetId = -1;
    pendingTargetName = "";
    hideDonateButton();
    hideHint();
  }

  function confirmSelection() {
    if (!selecting || pendingTargetId < 0) return false;
    const target = pendingTargetId;
    const targetName = pendingTargetName;
    const stats = currentStats();
    selecting = false;
    hideDonateButton();
    hideHint();
    setMainPlayer({ id: target, name: targetName });

    const api = automation();
    if (!api) return false;
    if (!enabled) {
      const settings = window.__fx.settings || {};
      saved = {
        opening: Boolean(settings.openingAutomationEnabled),
        infinite: Boolean(settings.infiniteExpansionEnabled),
        mode: api.getAutoAttackMode(),
      };
      api.setAllAutomationEnabled(false);
      enabled = true;
    }

    lastSupportAt = 0;
    lastSupportOk = null;
    const donated = donateOnce(target);
    if (stats.density >= DENSITY_THRESHOLD) {
      looping = true;
      startLoop();
    } else {
      looping = false;
      stopLoop();
    }
    return donated;
  }

  function stopHoard() {
    if (!enabled && !selecting) return false;
    const wasEnabled = enabled;
    enabled = false;
    looping = false;
    stopLoop();
    cancelSelection();
    if (wasEnabled && saved) {
      const api = automation();
      if (api) {
        api.setOpeningAutomationEnabled(saved.opening);
        api.setInfiniteExpansionEnabled(saved.infinite);
        api.setAutoAttackMode(saved.mode);
      }
      saved = null;
    }
    return true;
  }

  function getState() {
    const stats = currentStats();
    const target = resolveMainPlayer();
    return {
      selecting,
      enabled,
      looping,
      density: stats.density,
      troops: stats.troops,
      land: stats.land,
      mainPlayerId: target,
      mainPlayerName: mainPlayerName || "",
      pendingTargetName,
      threshold: DENSITY_THRESHOLD,
      supportPercent: SUPPORT_PERCENT,
      lastSupportAt,
      lastSupportOk,
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
    stopHoard,
    setMainPlayer,
    getMainPlayer: () => ({ id: resolveMainPlayer(), name: mainPlayerName || "" }),
    getPlayerList,
    getState,
  };
}
