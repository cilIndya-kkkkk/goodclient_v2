import { isZh, t } from "./i18n.js";
import { CHANGELOG, GUIDE } from "./helpContent.js";

const POSITION_KEY = "fx_help_panel_position";

let panel = null;
let body = null;
let currentTab = "changelog";
let positioned = false;
let tabButtons = {};

function lang() {
  return isZh() ? "zh" : "en";
}

function dateLabel(value) {
  if (value === "Earlier") return isZh() ? "更早" : "Earlier";
  return value;
}

function host() {
  return document.getElementById("windowContainer") || document.body;
}

function loadPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return saved;
  } catch (_error) {}
  return null;
}

function savePosition() {
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  localStorage.setItem(POSITION_KEY, JSON.stringify({
    left: Math.round(rect.left),
    top: Math.round(rect.top),
  }));
}

function applyPosition(left, top) {
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.transform = "none";
  panel.style.margin = "0";
}

function clampPosition() {
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  const maxLeft = Math.max(0, window.innerWidth - rect.width);
  const maxTop = Math.max(0, window.innerHeight - rect.height);
  const left = Math.min(Math.max(0, rect.left), maxLeft);
  const top = Math.min(Math.max(0, rect.top), maxTop);
  if (Math.round(left) !== Math.round(rect.left) || Math.round(top) !== Math.round(rect.top)) {
    applyPosition(left, top);
  }
}

function makeDraggable(element, handle) {
  handle.style.cursor = "move";
  handle.style.touchAction = "none";
  let drag = null;

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest("button")) return;
    const rect = element.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    applyPosition(rect.left, rect.top);
    handle.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  handle.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, Math.min(event.clientX - drag.offsetX, window.innerWidth - rect.width));
    const top = Math.max(0, Math.min(event.clientY - drag.offsetY, window.innerHeight - rect.height));
    event.preventDefault();
    applyPosition(left, top);
  });
  const stop = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    savePosition();
  };
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
}

function makeTabButton(label, tab) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "fx-help-tab";
  button.textContent = label;
  button.addEventListener("click", () => selectTab(tab));
  return button;
}

function createPanel() {
  panel = document.createElement("div");
  panel.id = "fxHelpPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t("GoodClient Help"));

  const header = document.createElement("div");
  header.id = "fxHelpHeader";
  const title = document.createElement("span");
  title.id = "fxHelpTitle";
  title.textContent = t("GoodClient Help");
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "fx-help-close";
  closeButton.textContent = t("Close");
  closeButton.addEventListener("click", close);
  header.append(title, closeButton);

  const tabs = document.createElement("div");
  tabs.id = "fxHelpTabs";
  tabButtons.changelog = makeTabButton(t("Changelog"), "changelog");
  tabButtons.guide = makeTabButton(t("Usage Guide"), "guide");
  tabs.append(tabButtons.changelog, tabButtons.guide);

  body = document.createElement("div");
  body.id = "fxHelpBody";

  panel.append(header, tabs, body);
  host().appendChild(panel);
  makeDraggable(panel, header);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("open")) close();
  });
  window.addEventListener("resize", () => {
    if (panel.classList.contains("open")) clampPosition();
  });
}

function renderChangelog() {
  const language = lang();
  const wrapper = document.createElement("div");
  wrapper.className = "fx-help-changelog";
  for (const entry of CHANGELOG) {
    const card = document.createElement("article");
    card.className = "fx-help-changelog-entry";

    const date = document.createElement("div");
    date.className = "fx-help-changelog-date";
    date.textContent = dateLabel(entry.date);

    const entryTitle = document.createElement("div");
    entryTitle.className = "fx-help-changelog-title";
    entryTitle.textContent = entry.title[language] || entry.title.en;

    const list = document.createElement("ul");
    const items = entry.items[language] || entry.items.en;
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    }

    card.append(date, entryTitle, list);
    wrapper.appendChild(card);
  }
  body.appendChild(wrapper);
}

function openGuideSection(section) {
  section.open = true;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderGuide() {
  const language = lang();
  const wrapper = document.createElement("div");
  wrapper.className = "fx-help-guide";

  const toc = document.createElement("div");
  toc.className = "fx-help-guide-toc";
  const sections = {};
  for (const item of GUIDE) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "fx-help-guide-chip";
    chip.textContent = item.title[language] || item.title.en;
    chip.addEventListener("click", () => {
      if (sections[item.id]) openGuideSection(sections[item.id]);
    });
    toc.appendChild(chip);
  }

  wrapper.appendChild(toc);
  GUIDE.forEach((item, index) => {
    const section = document.createElement("details");
    section.className = "fx-help-guide-section";
    section.open = index === 0;
    const summary = document.createElement("summary");
    summary.textContent = item.title[language] || item.title.en;
    const content = document.createElement("div");
    content.className = "fx-help-guide-body";
    content.innerHTML = item.html[language] || item.html.en;
    section.append(summary, content);
    sections[item.id] = section;
    wrapper.appendChild(section);
  });

  body.appendChild(wrapper);
}

function renderContent() {
  if (!body) return;
  body.textContent = "";
  tabButtons.changelog.classList.toggle("active", currentTab === "changelog");
  tabButtons.guide.classList.toggle("active", currentTab === "guide");
  if (currentTab === "changelog") renderChangelog();
  else renderGuide();
  body.scrollTop = 0;
}

function selectTab(tab) {
  currentTab = tab === "guide" ? "guide" : "changelog";
  renderContent();
}

function close() {
  if (!panel) return;
  panel.classList.remove("open");
}

export function openHelpPanel(tab = "changelog") {
  if (!panel) createPanel();
  if (!document.body.contains(panel)) host().appendChild(panel);
  panel.classList.add("open");
  if (!positioned) {
    const saved = loadPosition();
    if (saved) applyPosition(saved.left, saved.top);
    positioned = true;
    clampPosition();
  }
  selectTab(tab);
}
