import { t } from "../i18n.js";

const RECT_KEY = "fx_tabmode_window_rect";
const TOGGLE_KEY = "fx_tabmode_toggle_position";
const LEGACY_RECT_KEY = "fx_tabmode_panel_position";
const MIN_WIDTH = 260;
const MIN_HEIGHT = 190;
const DEFAULT_WIDTH = 460;
const DEFAULT_HEIGHT = 340;
const POLL_INTERVAL = 800;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadTogglePosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOGGLE_KEY) || "null");
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return saved;
  } catch (_error) {}
  return null;
}

function saveTogglePosition(element) {
  const rect = element.getBoundingClientRect();
  localStorage.setItem(TOGGLE_KEY, JSON.stringify({
    left: Math.round(rect.left),
    top: Math.round(rect.top),
  }));
}

function clampRect(rect) {
  const width = clamp(Number(rect.width) || DEFAULT_WIDTH, Math.min(MIN_WIDTH, window.innerWidth), window.innerWidth);
  const height = clamp(Number(rect.height) || DEFAULT_HEIGHT, Math.min(MIN_HEIGHT, window.innerHeight), window.innerHeight);
  return {
    left: clamp(Number(rect.left) || 0, 0, Math.max(0, window.innerWidth - width)),
    top: clamp(Number(rect.top) || 0, 0, Math.max(0, window.innerHeight - height)),
    width,
    height,
  };
}

function loadRect() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECT_KEY) || "null");
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return clampRect(saved);
  } catch (_error) {}
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_RECT_KEY) || "null");
    if (legacy && Number.isFinite(legacy.left) && Number.isFinite(legacy.top)) {
      return clampRect({
        left: legacy.left,
        top: legacy.top,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      });
    }
  } catch (_error) {}
  return clampRect({
    left: Math.round((window.innerWidth - DEFAULT_WIDTH) / 2),
    top: Math.round((window.innerHeight - DEFAULT_HEIGHT) / 2),
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
}

function saveRect(rect) {
  localStorage.setItem(RECT_KEY, JSON.stringify({
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }));
}

function setFrameRect(frame, rect, zIndex) {
  frame.style.left = `${Math.round(rect.left)}px`;
  frame.style.top = `${Math.round(rect.top)}px`;
  frame.style.width = `${Math.round(rect.width)}px`;
  frame.style.height = `${Math.round(rect.height)}px`;
  frame.style.right = "auto";
  frame.style.bottom = "auto";
  frame.style.zIndex = String(zIndex);
}

function setInert(frame, inert) {
  if (!frame) return;
  frame.inert = inert;
  if (inert) frame.setAttribute("inert", "");
  else frame.removeAttribute("inert");
}

export default function initHostTabMode({ mainFrame, frameUrl, attachGestureForwarding }) {
  let rect = loadRect();
  let openState = false;
  let swappedState = false;
  let botFrame = null;
  let statusTimer = null;
  let toggleDrag = null;
  let suppressToggleClick = false;
  let panelDrag = null;

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

  const title = document.createElement("span");
  title.id = "fxTabModeTitle";
  title.textContent = t("Tab Mode");

  const status = document.createElement("span");
  status.id = "fxTabModeStatus";
  status.textContent = t("Bot not loaded");

  const swapButton = document.createElement("button");
  swapButton.type = "button";
  swapButton.className = "fx-tabmode-button";
  swapButton.textContent = t("Swap");

  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.className = "fx-tabmode-button";
  reloadButton.textContent = t("Reload bot");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "fx-tabmode-button";
  closeButton.textContent = t("Close");

  header.append(title, status, swapButton, reloadButton, closeButton);

  const slot = document.createElement("div");
  slot.id = "fxTabModeSlot";

  panel.append(header, slot);
  document.body.append(toggle, panel);

  function ensureBotFrame() {
    if (botFrame) return botFrame;
    botFrame = document.createElement("iframe");
    botFrame.id = "fxBotFrame";
    botFrame.title = "Bot";
    botFrame.allow = "autoplay; fullscreen";
    botFrame.style.left = "0";
    botFrame.style.top = "0";
    botFrame.style.width = "0";
    botFrame.style.height = "0";
    botFrame.style.opacity = "0";
    botFrame.style.pointerEvents = "none";
    setInert(botFrame, true);
    document.body.appendChild(botFrame);
    if (attachGestureForwarding) attachGestureForwarding(botFrame);
    botFrame.addEventListener("load", () => {
      applyCleanStates();
      layout();
    });
    botFrame.src = frameUrl("bot.html", { bot: "1" });
    return botFrame;
  }

  function getBotFx() {
    if (!botFrame) return null;
    try {
      return botFrame.contentWindow ? botFrame.contentWindow.__fx || null : null;
    } catch (_error) {
      return null;
    }
  }

  function showBotFrame() {
    if (!botFrame) return;
    botFrame.style.opacity = "1";
    botFrame.style.pointerEvents = "auto";
    setInert(botFrame, false);
  }

  function hideBotFrame() {
    if (!botFrame) return;
    botFrame.style.opacity = "0";
    botFrame.style.pointerEvents = "none";
    setInert(botFrame, true);
    try {
      if (botFrame.contentWindow && botFrame.contentWindow.document.activeElement) {
        botFrame.contentWindow.document.activeElement.blur();
      }
    } catch (_error) {}
  }

  function layout() {
    if (!openState) {
      setFrameRect(mainFrame, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, 100);
      if (botFrame) hideBotFrame();
      return;
    }

    const slotRect = slot.getBoundingClientRect();
    const fullFrame = swappedState ? botFrame : mainFrame;
    const windowFrame = swappedState ? mainFrame : botFrame;

    if (fullFrame) setFrameRect(fullFrame, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, 100);
    if (windowFrame) setFrameRect(windowFrame, slotRect, 300);
    if (botFrame) showBotFrame();
  }

  function applyRect() {
    rect = clampRect(rect);
    panel.style.left = `${Math.round(rect.left)}px`;
    panel.style.top = `${Math.round(rect.top)}px`;
    panel.style.width = `${Math.round(rect.width)}px`;
    panel.style.height = `${Math.round(rect.height)}px`;
    layout();
  }

  function applyCleanState(frame, enabled, attempts = 0) {
    if (!frame) return;
    let view = null;
    try {
      view = frame.contentWindow && frame.contentWindow.__fx ? frame.contentWindow.__fx.cleanView : null;
    } catch (_error) {}
    if (view) {
      view.setEnabled(enabled, { hideFx: true, lowDpr: true });
      return;
    }
    if (attempts < 20) {
      setTimeout(() => applyCleanState(frame, enabled, attempts + 1), 250);
    }
  }

  function applyCleanStates() {
    if (!openState) {
      applyCleanState(mainFrame, false);
      if (botFrame) applyCleanState(botFrame, true);
      return;
    }
    if (swappedState) {
      applyCleanState(mainFrame, true);
      if (botFrame) applyCleanState(botFrame, false);
    } else {
      applyCleanState(mainFrame, false);
      if (botFrame) applyCleanState(botFrame, true);
    }
  }

  function renderStatus() {
    const fx = getBotFx();
    const automation = fx && fx.openingAutomation ? fx.openingAutomation : null;
    if (!botFrame) {
      status.textContent = t("Bot not loaded");
      status.classList.add("bad");
      return;
    }
    if (!automation) {
      status.textContent = t("Bot loading…");
      status.classList.remove("bad");
      return;
    }
    status.classList.remove("bad");
    const settings = fx.settings || {};
    const tick = Number(automation.lastTick ?? -1);
    const mode = automation.getAutoAttackMode();
    status.textContent =
      `${t("Bot ready")} · tick ${tick} · ` +
      `${t("Opening")} ${settings.openingAutomationEnabled ? t("On") : t("Off")} · ` +
      `${t("Infinite")} ${settings.infiniteExpansionEnabled ? t("On") : t("Off")} · ` +
      `${t("Bot")} ${mode}`;
  }

  function startStatusPolling() {
    stopStatusPolling();
    renderStatus();
    statusTimer = setInterval(renderStatus, POLL_INTERVAL);
  }

  function stopStatusPolling() {
    if (statusTimer !== null) {
      clearInterval(statusTimer);
      statusTimer = null;
    }
  }

  function focusFullFrame() {
    const frame = swappedState ? botFrame : mainFrame;
    if (!frame) return;
    setTimeout(() => {
      try {
        frame.contentWindow.focus();
      } catch (_error) {}
    }, 0);
  }

  function open() {
    if (openState) return;
    ensureBotFrame();
    openState = true;
    panel.classList.add("open");
    applyRect();
    applyCleanStates();
    startStatusPolling();
    saveRect(rect);
  }

  function close() {
    if (!openState) return;
    if (swappedState) {
      swappedState = false;
      layout();
      applyCleanStates();
    }
    openState = false;
    panel.classList.remove("open");
    layout();
    applyCleanStates();
    stopStatusPolling();
    saveRect(rect);
  }

  function togglePanel() {
    if (openState) close();
    else open();
  }

  function swap() {
    if (!openState) return;
    ensureBotFrame();
    swappedState = !swappedState;
    layout();
    applyCleanStates();
    focusFullFrame();
  }

  function reload() {
    ensureBotFrame();
    try {
      botFrame.contentWindow.location.reload();
    } catch (_error) {
      botFrame.src = frameUrl("bot.html", { bot: "1" });
    }
    applyCleanStates();
  }

  function setSize(width, height) {
    rect = clampRect({
      left: rect.left,
      top: rect.top,
      width: Number(width) || rect.width,
      height: Number(height) || rect.height,
    });
    applyRect();
    saveRect(rect);
  }

  function getRect() {
    return { ...rect };
  }

  function applyTogglePosition(left, top, persist) {
    const rectWidth = toggle.getBoundingClientRect().width || 64;
    const rectHeight = toggle.getBoundingClientRect().height || 32;
    const nextLeft = clamp(left, 0, Math.max(0, window.innerWidth - rectWidth));
    const nextTop = clamp(top, 0, Math.max(0, window.innerHeight - rectHeight));
    toggle.style.left = `${Math.round(nextLeft)}px`;
    toggle.style.top = `${Math.round(nextTop)}px`;
    toggle.style.right = "auto";
    toggle.style.bottom = "auto";
    if (persist) localStorage.setItem(TOGGLE_KEY, JSON.stringify({ left: Math.round(nextLeft), top: Math.round(nextTop) }));
  }

  toggle.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const box = toggle.getBoundingClientRect();
    toggleDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      moved: false,
    };
    toggle.setPointerCapture?.(event.pointerId);
  });

  toggle.addEventListener("pointermove", (event) => {
    if (!toggleDrag || toggleDrag.pointerId !== event.pointerId) return;
    const dx = event.clientX - toggleDrag.startX;
    const dy = event.clientY - toggleDrag.startY;
    if (!toggleDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) toggleDrag.moved = true;
    if (toggleDrag.moved) {
      applyTogglePosition(event.clientX - toggleDrag.offsetX, event.clientY - toggleDrag.offsetY, false);
    }
  });

  function finishToggleDrag(event) {
    if (!toggleDrag || toggleDrag.pointerId !== event.pointerId) return;
    const moved = toggleDrag.moved;
    toggleDrag = null;
    if (moved) {
      saveTogglePosition(toggle);
      suppressToggleClick = true;
      setTimeout(() => { suppressToggleClick = false; }, 0);
    }
  }

  toggle.addEventListener("pointerup", finishToggleDrag);
  toggle.addEventListener("pointercancel", finishToggleDrag);
  toggle.addEventListener("click", (event) => {
    if (suppressToggleClick) {
      suppressToggleClick = false;
      event.preventDefault();
      return;
    }
    togglePanel();
  });

  header.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    panelDrag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    header.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  header.addEventListener("pointermove", (event) => {
    if (!panelDrag || panelDrag.pointerId !== event.pointerId) return;
    rect = clampRect({
      left: event.clientX - panelDrag.offsetX,
      top: event.clientY - panelDrag.offsetY,
      width: rect.width,
      height: rect.height,
    });
    applyRect();
  });

  function finishPanelDrag(event) {
    if (!panelDrag || panelDrag.pointerId !== event.pointerId) return;
    panelDrag = null;
    saveRect(rect);
  }

  header.addEventListener("pointerup", finishPanelDrag);
  header.addEventListener("pointercancel", finishPanelDrag);

  swapButton.addEventListener("click", swap);
  reloadButton.addEventListener("click", reload);
  closeButton.addEventListener("click", close);

  window.addEventListener("resize", () => {
    rect = clampRect(rect);
    applyRect();
    const box = toggle.getBoundingClientRect();
    applyTogglePosition(box.left, box.top, false);
    saveRect(rect);
  });

  mainFrame.addEventListener("load", applyCleanStates);

  const savedToggle = loadTogglePosition();
  if (savedToggle) applyTogglePosition(savedToggle.left, savedToggle.top, false);
  else applyTogglePosition(8, 104, false);

  applyRect();
  applyCleanStates();

  return {
    open,
    close,
    toggle: togglePanel,
    reload,
    swap,
    isOpen: () => openState,
    isSwapped: () => swappedState,
    getBotFx,
    getRect,
    setSize,
    panel,
    toggle,
  };
}
