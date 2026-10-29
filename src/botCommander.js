import { getVar } from "./gameInterface.js";

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
  let enabled = false;
  let timer = null;
  let saved = null;
  let lastSupportAt = 0;
  let lastSupportOk = null;
  let mainPlayerName = localStorage.getItem(MAIN_PLAYER_KEY) || "";
  let mainPlayerId = -1;

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

  function trySupport() {
    if (!enabled || !gameReady()) return false;
    const now = Date.now();
    if (now - lastSupportAt < SUPPORT_INTERVAL_MS) return false;
    const target = resolveMainPlayer();
    if (target < 0) return false;
    const stats = currentStats();
    if (stats.land <= 0 || stats.density < DENSITY_THRESHOLD) return false;
    const automation = window.__fx && window.__fx.openingAutomation;
    if (!automation || typeof automation.sendSupport !== "function") return false;
    lastSupportAt = now;
    lastSupportOk = Boolean(automation.sendSupport(target, SUPPORT_PERCENT));
    return lastSupportOk;
  }

  function tick() {
    trySupport();
  }

  function hoard(value) {
    const next = Boolean(value);
    if (next === enabled) return enabled;
    const automation = window.__fx && window.__fx.openingAutomation;
    if (!automation) return enabled;

    if (next) {
      const settings = window.__fx.settings || {};
      saved = {
        opening: Boolean(settings.openingAutomationEnabled),
        infinite: Boolean(settings.infiniteExpansionEnabled),
        mode: automation.getAutoAttackMode(),
      };
      automation.setAllAutomationEnabled(false);
      enabled = true;
      lastSupportAt = 0;
      lastSupportOk = null;
      if (timer !== null) clearInterval(timer);
      timer = setInterval(tick, TICK_INTERVAL_MS);
    } else {
      enabled = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (saved) {
        automation.setOpeningAutomationEnabled(saved.opening);
        automation.setInfiniteExpansionEnabled(saved.infinite);
        automation.setAutoAttackMode(saved.mode);
        saved = null;
      }
    }
    return enabled;
  }

  function getState() {
    const stats = currentStats();
    const target = resolveMainPlayer();
    return {
      enabled,
      density: stats.density,
      troops: stats.troops,
      land: stats.land,
      mainPlayerId: target,
      mainPlayerName: mainPlayerName || "",
      threshold: DENSITY_THRESHOLD,
      supportPercent: SUPPORT_PERCENT,
      lastSupportAt,
      lastSupportOk,
    };
  }

  return {
    hoard,
    setMainPlayer,
    getMainPlayer: () => ({ id: resolveMainPlayer(), name: mainPlayerName || "" }),
    getPlayerList,
    getState,
  };
}
