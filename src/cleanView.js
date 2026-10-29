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

  function gameGlobals() {
    return {
      game: window.c,
      ui: window.nr,
    };
  }

  function hideGameUi() {
    const { game, ui } = gameGlobals();
    if (game && ui && typeof ui.nE === "function" && game.gG !== true) {
      ui.nE(true);
    }
  }

  function showGameUi(attempts = 0) {
    if (restoreTimer !== null) {
      clearTimeout(restoreTimer);
      restoreTimer = null;
    }
    const { game, ui } = gameGlobals();
    if (!game || !ui || typeof ui.nE !== "function") {
      if (attempts < 20) {
        restoreTimer = setTimeout(() => {
          restoreTimer = null;
          showGameUi(attempts + 1);
        }, 250);
      }
      return;
    }
    if (game.gG === true) ui.nE(false);
    if (game.gG === true && attempts < 20) {
      restoreTimer = setTimeout(() => {
        restoreTimer = null;
        showGameUi(attempts + 1);
      }, 250);
    }
  }

  function startPolling() {
    if (pollTimer !== null) return;
    hideGameUi();
    pollTimer = setInterval(hideGameUi, 500);
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
