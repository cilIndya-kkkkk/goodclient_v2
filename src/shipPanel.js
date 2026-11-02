import { getSettings, persistSettings } from "./settings.js";
import { getVar } from "./gameInterface.js";

const HEIGHT_KEY = "fx_ship_panel_height";
const DEFAULT_HEIGHT = 180;
const REFRESH_MS = 500;

let panel = null;
let bodyEl = null;
let statusEl = null;
let autoCheckbox = null;
let resizeEl = null;
let currentHeight = DEFAULT_HEIGHT;
let resizeDrag = null;

function formatTroops(value) {
  const number = Number(value) || 0;
  if (number >= 1e9) return `${(number / 1e9).toFixed(1)}b`;
  if (number >= 1e6) return `${(number / 1e6).toFixed(1)}m`;
  if (number >= 1e3) return `${(number / 1e3).toFixed(1)}k`;
  return String(Math.round(number));
}

function inGame() {
  try {
    const state = Number(getVar("gameState") || 0);
    return (state === 1 || state === 2) && !getVar("gIsReplay");
  } catch (_error) {
    return false;
  }
}

function host() {
  return document.getElementById("windowContainer") || document.body;
}

function loadHeight() {
  const saved = Number(localStorage.getItem(HEIGHT_KEY));
  return Number.isFinite(saved) && saved >= 80 ? saved : DEFAULT_HEIGHT;
}

function leaderboardTop() {
  const rect = window.__fx && window.__fx.leaderboardRect;
  if (rect && Number.isFinite(rect.height) && rect.height > 0) {
    return Math.min(rect.height + 8, window.innerHeight * 0.62);
  }
  return Math.max(140, Math.min(window.innerHeight * 0.45, 420));
}

function panelWidth() {
  const rect = window.__fx && window.__fx.leaderboardRect;
  if (rect && Number.isFinite(rect.width) && rect.width > 0) {
    return Math.min(Math.max(rect.width, 190), 280);
  }
  return 240;
}

function applyLayout() {
  if (!panel) return;
  const top = Math.round(leaderboardTop());
  const maxHeight = Math.max(80, window.innerHeight - top - 8);
  currentHeight = Math.min(Math.max(currentHeight, 80), maxHeight);
  panel.style.top = `${top}px`;
  panel.style.width = `${Math.round(Math.min(panelWidth(), window.innerWidth - 16))}px`;
  panel.style.height = `${Math.round(currentHeight)}px`;
}

function makeButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fx-ship-button ${className}`.trim();
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createPanel() {
  panel = document.createElement("div");
  panel.id = "fxShipPanel";
  panel.classList.add("hidden");

  const header = document.createElement("div");
  header.id = "fxShipPanelHeader";
  const title = document.createElement("span");
  title.className = "fx-ship-title";
  title.textContent = "Shipping";
  const autoLabel = document.createElement("label");
  autoLabel.className = "fx-ship-auto";
  autoCheckbox = document.createElement("input");
  autoCheckbox.type = "checkbox";
  autoCheckbox.addEventListener("change", () => {
    const settings = getSettings();
    settings.autoInterceptShips = autoCheckbox.checked;
    persistSettings();
    render();
  });
  autoLabel.append(autoCheckbox, document.createTextNode(" Auto"));
  header.append(title, autoLabel);

  bodyEl = document.createElement("div");
  bodyEl.id = "fxShipPanelBody";

  statusEl = document.createElement("div");
  statusEl.className = "fx-ship-status";
  statusEl.textContent = "Waiting for ships";

  resizeEl = document.createElement("div");
  resizeEl.id = "fxShipPanelResize";
  resizeEl.title = "Drag to resize";

  panel.append(header, bodyEl, resizeEl);
  host().appendChild(panel);

  resizeEl.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    resizeDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: currentHeight,
    };
    resizeEl.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  resizeEl.addEventListener("pointermove", (event) => {
    if (!resizeDrag || resizeDrag.pointerId !== event.pointerId) return;
    currentHeight = Math.max(80, resizeDrag.startHeight + event.clientY - resizeDrag.startY);
    applyLayout();
  });
  const stopResize = (event) => {
    if (!resizeDrag || resizeDrag.pointerId !== event.pointerId) return;
    resizeDrag = null;
    localStorage.setItem(HEIGHT_KEY, String(Math.round(currentHeight)));
  };
  resizeEl.addEventListener("pointerup", stopResize);
  resizeEl.addEventListener("pointercancel", stopResize);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.classList.contains("hidden")) {
      const settings = getSettings();
      settings.showShipPanel = false;
      persistSettings();
      render();
    }
  });
}

function renderAttackerRow(attacker, myTotalTroops) {
  const row = document.createElement("div");
  row.className = "fx-ship-attacker";
  const name = document.createElement("span");
  name.className = "fx-ship-attacker-name";
  name.textContent = attacker.name || `Player ${attacker.player}`;
  const troops = document.createElement("span");
  troops.className = "fx-ship-attacker-troops";
  troops.textContent = formatTroops(attacker.troops);
  const color = Number(attacker.troops) < Number(myTotalTroops) * 0.1 ? "red" : "purple";
  row.classList.add(color === "red" ? "fx-ship-attacker-red" : "fx-ship-attacker-purple");

  const shield = makeButton("Shield", () => {
    window.__fx.shipAuto?.shield(attacker, myTotalTroops);
  }, "fx-ship-shield");
  shield.disabled = Boolean(attacker.insufficient);
  if (shield.disabled) shield.title = "Not enough troops for a 105% intercept";

  row.append(name, troops, shield);
  return row;
}

function renderList() {
  if (!bodyEl) return;
  bodyEl.textContent = "";
  const intel = window.__fx.shipIntel;
  if (!intel || !Array.isArray(intel.myShips) || intel.myShips.length === 0) {
    statusEl.textContent = inGame() ? "No ships detected" : "Waiting for a match";
    bodyEl.append(statusEl);
    return;
  }
  statusEl.textContent = `${intel.myShips.length} ship${intel.myShips.length === 1 ? "" : "s"}`;
  bodyEl.append(statusEl);
  for (const ship of intel.myShips) {
    const row = document.createElement("div");
    row.className = "fx-ship-row";
    const head = document.createElement("div");
    head.className = "fx-ship-head";
    const label = document.createElement("span");
    label.className = "fx-ship-name";
    label.textContent = `Ship ${ship.index + 1}`;
    const stats = document.createElement("span");
    stats.className = "fx-ship-stats";
    stats.textContent = `${formatTroops(ship.troops)} · ${Math.round(ship.progress * 100)}%`;
    head.append(label, stats);
    row.appendChild(head);
    if (Array.isArray(ship.attackers) && ship.attackers.length) {
      for (const attacker of ship.attackers) {
        row.appendChild(renderAttackerRow(attacker, intel.myTotalTroops));
      }
    } else {
      const safe = document.createElement("div");
      safe.className = "fx-ship-safe";
      safe.textContent = "No attackers";
      row.appendChild(safe);
    }
    bodyEl.appendChild(row);
  }
}

function render() {
  if (!panel) return;
  const settings = getSettings();
  const clean = document.body.classList.contains("fx-clean");
  const visible = Boolean(settings.showShipPanel) && inGame() && !clean;
  panel.classList.toggle("hidden", !visible);
  if (!visible) return;
  autoCheckbox.checked = Boolean(settings.autoInterceptShips);
  applyLayout();
  renderList();
  window.__fx.shipAuto?.update?.();
}

export default function initShipPanel() {
  if (!panel) createPanel();
  currentHeight = loadHeight();
  applyLayout();
  render();
  setInterval(render, REFRESH_MS);
  window.addEventListener("resize", () => {
    applyLayout();
  });
  return {
    render,
    resetHeight() {
      currentHeight = DEFAULT_HEIGHT;
      localStorage.removeItem(HEIGHT_KEY);
      applyLayout();
    },
    isOpen() {
      return panel && !panel.classList.contains("hidden");
    },
  };
}
