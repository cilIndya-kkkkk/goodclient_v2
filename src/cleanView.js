const REAL_DPR = Number(window.devicePixelRatio) || 1;
let dprLow = false;

try {
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    get() {
      return dprLow ? 1 : REAL_DPR;
    },
  });
} catch (_error) {}

function setDprLow(value) {
  if (dprLow === value) return;
  dprLow = value;
  window.dispatchEvent(new Event("resize"));
}

export default function initCleanView() {
  let enabled = false;
  let hideFx = true;
  let lowDpr = true;
  let pollTimer = null;
  let restoreTimer = null;

  function legacyGlobals() {
    return {
      game: window.ct || window.c,
      ui: window.hM || window.nr,
    };
  }

  function gameUi() {
    return window.__fx && window.__fx.gameUi ? window.__fx.gameUi : null;
  }

  function isHidden() {
    const api = gameUi();
    if (api && typeof api.isHidden === "function") {
      try {
        return Boolean(api.isHidden());
      } catch (_error) {}
    }
    const { game } = legacyGlobals();
    return Boolean(game && (game.gG === true || game.ur === true));
  }

  function isSpawnSelection() {
    const api = gameUi();
    if (api && typeof api.isSpawnSelection === "function") {
      try {
        return Boolean(api.isSpawnSelection());
      } catch (_error) {}
    }
    const { game } = legacyGlobals();
    return Boolean(game && (game.ao === true || game.dO === true));
  }

  function forceGameUi(value) {
    const game = legacyGlobals().game;
    if (!game || typeof game !== "object") return false;
    if ("ur" in game) game.ur = Boolean(value);
    else if ("gG" in game) game.gG = Boolean(value);
    else return false;
    try {
      if (window.hE && typeof window.hE.resize === "function") window.hE.resize();
    } catch (_error) {}
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (_error) {}
    return true;
  }

  function setHidden(value) {
    const api = gameUi();
    if (api && typeof api.setHidden === "function") {
      try {
        api.setHidden(value);
      } catch (_error) {}
      if (isHidden() === Boolean(value)) return true;
    }
    const { game, ui } = legacyGlobals();
    if (game && ui && typeof ui.nE === "function") {
      try {
        ui.nE(value);
      } catch (_error) {}
      if (isHidden() === Boolean(value)) return true;
    }
    return forceGameUi(value);
  }

  function syncGameUi() {
    if (isSpawnSelection()) {
      if (isHidden()) setHidden(false);
    } else if (!isHidden()) {
      setHidden(true);
    }
  }

  function showGameUi(attempts = 0) {
    if (restoreTimer !== null) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }
    const available = gameUi() || legacyGlobals().ui;
    if (!available) {
      if (attempts < 20) {
        restoreTimer = setTimeout(() => {
          restoreTimer = null;
          showGameUi(attempts + 1);
        }, 250);
      }
      return;
    }
    if (isHidden()) setHidden(false);
    if (isHidden()) {
      if (attempts < 20) {
        restoreTimer = setTimeout(() => {
          restoreTimer = null;
          showGameUi(attempts + 1);
        }, 250);
      } else {
        forceGameUi(false);
      }
    }
  }

  function startPolling() {
    if (pollTimer !== null) return;
    syncGameUi();
    pollTimer = setInterval(syncGameUi, 500);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function applyClass() {
    document.body.classList.toggle("fx-clean", enabled && hideFx);
  }

  function setEnabled(value, options = {}) {
    enabled = Boolean(value);
    hideFx = options.hideFx !== false;
    lowDpr = options.lowDpr !== false;
    applyClass();
    setDprLow(enabled && lowDpr);

    if (enabled) {
      stopPolling();
      startPolling();
    } else {
      stopPolling();
      showGameUi();
      setDprLow(false);
    }
  }

  function isEnabled() {
    return enabled;
  }

  return { setEnabled, isEnabled };
}
