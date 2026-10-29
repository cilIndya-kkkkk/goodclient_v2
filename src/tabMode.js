import { t } from "./i18n.js";
import { isBotInstance } from "./instance.js";

const BOT_PARAM = "bot";
const BOT_PAGE = "bot.html";
const TOGGLE_POSITION_KEY = "fx_tabmode_toggle_position";
const PANEL_POSITION_KEY = "fx_tabmode_panel_position";
const POLL_INTERVAL = 800;

export { isBotInstance as isTabBotInstance };

function currentBuildVersion() {
  // Prefer the stamp on the fx.bundle.js <script> (same source as the update checker);
  // the bundle's `buildTimestamp` global is stale after `build-client` (no re-patch).
  const script = Array.from(document.scripts).find((item) => /(^|\/)fx\.bundle\.js\?\d+/.test(item.src));
  if (script) {
    try {
      const stamp = new URL(script.src, location.href).search.replace(/^\?/, "");
      if (stamp) return stamp;
    } catch (_error) {}
  }
  // eslint-disable-next-line no-undef
  if (typeof buildTimestamp !== "undefined" && buildTimestamp) return String(buildTimestamp);
  return String(Date.now());
}

function botUrl() {
  // Separate minimal page: no service worker registration, no update prompt.
  // Versioned so the service worker (which caches by full URL) cannot serve a stale copy.
  const url = new URL(BOT_PAGE, location.href);
  url.searchParams.set(BOT_PARAM, "1");
  url.searchParams.set("v", currentBuildVersion());
  const relay = new URLSearchParams(location.search).get("relay");
  if (relay) url.searchParams.set("relay", relay);
  return url.href;
}

function makeDraggable(element, handle, { onEnd, allowClick = false } = {}) {
  handle.style.cursor = "move";
  handle.style.userSelect = "none";
  handle.style.touchAction = "none";
  let drag = null;
  let suppressNextClick = false;

  function start(event) {
    const rect = element.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
    element.style.transform = "none";
    element.style.margin = "0";
  }

  function move(x, y) {
    if (!drag) return;
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, Math.min(x - drag.offsetX, window.innerWidth - rect.width));
    const top = Math.max(0, Math.min(y - drag.offsetY, window.innerHeight - rect.height));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function end(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    element.classList.remove("dragging");
    if (!moved) return;
    if (onEnd) onEnd(element);
    if (allowClick) {
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 0);
    }
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (handle !== element && event.target.closest("button")) return;
    if (!allowClick) event.preventDefault();
    start(event);
    handle.setPointerCapture?.(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      drag.moved = true;
      element.classList.add("dragging");
    }
    if (drag.moved) {
      event.preventDefault();
      move(event.clientX, event.clientY);
    }
  });
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);

  return () => {
    if (!suppressNextClick) return false;
    suppressNextClick = false;
    return true;
  };
}

function loadPosition(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return saved;
  } catch (_error) {}
  return null;
}

function savePosition(key, element) {
  const rect = element.getBoundingClientRect();
  localStorage.setItem(key, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
}

function clampToViewport(element, left, top) {
  const rect = element.getBoundingClientRect();
  const maxLeft = Math.max(0, window.innerWidth - rect.width);
  const maxTop = Math.max(0, window.innerHeight - rect.height);
  element.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
  element.style.top = `${Math.min(Math.max(0, top), maxTop)}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
  element.style.transform = "none";
  element.style.margin = "0";
}

export default function initTabMode() {
  if (isBotInstance()) return null;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "fxTabModeToggle";
  toggle.textContent = t("Bot");
  toggle.title = t("Bot view (Tab Mode, drag to move, click to open)");

  const panel = document.createElement("div");
  panel.id = "fxTabMode";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Tab Mode");

  const header = document.createElement("div");
  header.id = "fxTabModeHeader";
  const headerTitle = document.createElement("span");
  headerTitle.textContent = t("Tab Mode");
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "fx-tabmode-close";
  closeButton.textContent = t("Close");
  header.append(headerTitle, closeButton);

  const body = document.createElement("div");
  body.id = "fxTabModeBody";

  const actions = document.createElement("div");
  actions.id = "fxTabModeActions";
  const statusEl = document.createElement("div");
  statusEl.id = "fxTabModeStatus";
  statusEl.textContent = t("Bot not loaded");
  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.className = "fx-tabmode-button";
  reloadButton.textContent = t("Reload bot");
  reloadButton.addEventListener("click", () => reload());
  actions.append(statusEl, reloadButton);

  const frameWrap = document.createElement("div");
  frameWrap.id = "fxTabModeFrameWrap";

  body.append(actions, frameWrap);
  panel.append(header, body);

  let frame = null;
  let pollTimer = null;
  let ready = false;

  function ensureFrame() {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.id = "fxTabModeFrame";
    frame.title = t("Bot view");
    frame.allow = "autoplay; fullscreen";
    frame.src = botUrl();
    frameWrap.append(frame);
  }

  function getBotFx() {
    if (!frame) return null;
    try {
      return frame.contentWindow ? frame.contentWindow.__fx || null : null;
    } catch (_error) {
      return null;
    }
  }

  function reload() {
    if (!frame) {
      ensureFrame();
      return;
    }
    try {
      frame.contentWindow.location.reload();
    } catch (_error) {
      frame.src = botUrl();
    }
  }

  function renderStatus() {
    const fx = getBotFx();
    const automation = fx && fx.openingAutomation ? fx.openingAutomation : null;
    if (!frame) {
      ready = false;
      statusEl.textContent = t("Bot not loaded");
      statusEl.classList.add("bad");
      reloadButton.disabled = false;
      return;
    }
    if (!automation) {
      ready = false;
      statusEl.textContent = t("Bot loading…");
      statusEl.classList.remove("bad");
      return;
    }
    ready = true;
    statusEl.classList.remove("bad");
    const settings = fx.settings || {};
    const tick = Number(automation.lastTick ?? -1);
    const mode = automation.getAutoAttackMode();
    statusEl.textContent =
      `${t("Bot ready")} · tick ${tick} · ` +
      `${t("Opening")} ${settings.openingAutomationEnabled ? t("On") : t("Off")} · ` +
      `${t("Infinite")} ${settings.infiniteExpansionEnabled ? t("On") : t("Off")} · ` +
      `${t("Bot")} ${mode}`;
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(renderStatus, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function host() {
    return document.getElementById("windowContainer") || document.body;
  }

  function ensureAttached() {
    const target = host();
    if (!target.contains(toggle)) target.append(toggle);
    if (!target.contains(panel)) target.append(panel);
  }

  function open() {
    ensureAttached();
    window.__fx.toolbox?.close?.();
    window.__fx.musicPlayer?.close?.();
    ensureFrame();
    panel.classList.add("open");
    if (!panel.dataset.positioned) {
      const saved = loadPosition(PANEL_POSITION_KEY);
      if (saved) clampToViewport(panel, saved.left, saved.top);
      panel.dataset.positioned = "1";
    }
    renderStatus();
    startPolling();
  }

  function close() {
    panel.classList.remove("open");
    stopPolling();
  }

  function togglePanel() {
    if (panel.classList.contains("open")) close();
    else open();
  }

  const consumeToggleClick = makeDraggable(toggle, toggle, {
    allowClick: true,
    onEnd: (element) => savePosition(TOGGLE_POSITION_KEY, element),
  });
  makeDraggable(panel, header, {
    onEnd: (element) => savePosition(PANEL_POSITION_KEY, element),
  });

  toggle.addEventListener("click", (event) => {
    if (consumeToggleClick()) {
      event.preventDefault();
      return;
    }
    togglePanel();
  });
  closeButton.addEventListener("click", close);

  ensureAttached();
  setInterval(ensureAttached, 1500);

  const savedToggle = loadPosition(TOGGLE_POSITION_KEY);
  if (savedToggle) clampToViewport(toggle, savedToggle.left, savedToggle.top);

  window.addEventListener("resize", () => {
    if (toggle.style.left) {
      const rect = toggle.getBoundingClientRect();
      clampToViewport(toggle, rect.left, rect.top);
    }
    if (panel.classList.contains("open") && panel.style.left) {
      const rect = panel.getBoundingClientRect();
      clampToViewport(panel, rect.left, rect.top);
    }
  });

  return {
    open,
    close,
    toggle: togglePanel,
    reload,
    getBotFx,
    isOpen: () => panel.classList.contains("open"),
    isReady: () => ready,
    panel,
    frameWrap,
  };
}