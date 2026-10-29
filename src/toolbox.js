import { getSettings, persistSettings } from "./settings.js";
import { getVar } from "./gameInterface.js";
import { normalizeStrategy } from "./openingAutomation.js";
import { openingTickOffsetToInternalTicks } from "./openingTickOffset.js";
import { attacksPerCycleToIntervalMs, intervalMsToAttacksPerCycle } from "./botAttackRate.js";
import DEFAULT_OPENING_STRATEGY from "./defaultOpeningStrategy.js";
import { t } from "./i18n.js";
import { isBotInstance, isEmbedded, getHost } from "./instance.js";

const POSITION_SUFFIX = isBotInstance() ? "_bot" : "";
const POSITION_STORAGE_KEY = "fx_toolbox_position" + POSITION_SUFFIX;
const TOGGLE_POSITION_STORAGE_KEY = "fx_toolbox_toggle_position" + POSITION_SUFFIX;
const PRESETS_KEY = "fx_opening_presets";
const BOT_MODES = [
  { value: "off", label: "Bot Off" },
  { value: "v20reserve", label: "V20 Reserve" },
  { value: "best", label: "Land Max" },
  { value: "messiah", label: "Messiah" }
];

function makeButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fx-toolbox-button ${className}`.trim();
  button.textContent = label;
  button.addEventListener("pointerdown", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    event.currentTarget.blur();
    onClick(event);
  });
  return button;
}

function makeSection(title) {
  const section = document.createElement("section");
  section.className = "fx-toolbox-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);
  return section;
}

function makeRow(...children) {
  const row = document.createElement("div");
  row.className = "fx-toolbox-row";
  row.append(...children);
  return row;
}

export default function initToolbox(options = {}) {
  const variant = options.variant === "bot" ? "bot" : "full";
  const embedded = isEmbedded() || new URLSearchParams(location.search).get("host") === "1";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "fxToolboxToggle";
  toggle.textContent = "Tools";
  toggle.title = "Drag to move, click to open (F2)";

  const panel = document.createElement("div");
  panel.id = "fxToolbox";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "GoodClient toolbox");

  const header = document.createElement("div");
  header.id = "fxToolboxHeader";
  const headerTitle = document.createElement("span");
  headerTitle.textContent = "GoodClient Toolbox";
  const closeButton = makeButton("Close", () => {
    panel.classList.remove("open");
  }, "fx-toolbox-close");
  header.append(headerTitle, closeButton);

  const body = document.createElement("div");
  body.id = "fxToolboxBody";

  const automationSection = makeSection("Automation");
  const onButton = makeButton("All On", () => {
    window.__fx.openingAutomation.setAllAutomationEnabled(true);
    render();
  });
  const offButton = makeButton("All Off", () => {
    window.__fx.openingAutomation.setAllAutomationEnabled(false);
    render();
  });
  const openingButton = makeButton("Opening", () => {
    window.__fx.openingAutomation.toggleOpeningAutomationEnabled();
    render();
  });
  const infiniteButton = makeButton("Infinite", () => {
    window.__fx.openingAutomation.toggleInfiniteExpansion();
    render();
  });
  const botModeSelect = document.createElement("select");
  botModeSelect.className = "fx-toolbox-input";
  for (const mode of BOT_MODES) {
    const option = document.createElement("option");
    option.value = mode.value;
    option.textContent = mode.label;
    botModeSelect.append(option);
  }
  botModeSelect.addEventListener("change", () => {
    window.__fx.openingAutomation.setAutoAttackMode(botModeSelect.value);
    render();
  });

  const spendLabel = document.createElement("span");
  spendLabel.textContent = "Bot send";
  const spendSlider = document.createElement("input");
  spendSlider.type = "range";
  spendSlider.min = "0";
  spendSlider.max = "100";
  spendSlider.step = "5";
  const spendValue = document.createElement("span");
  spendSlider.addEventListener("input", () => {
    const value = Number(spendSlider.value);
    window.__fx.openingAutomation.setBotSpendPercent(value);
    spendValue.textContent = `${value}%`;
  });

  const rateLabel = document.createElement("span");
  rateLabel.textContent = "Bot rate";
  const rateSlider = document.createElement("input");
  rateSlider.type = "range";
  rateSlider.min = "0";
  rateSlider.max = "20";
  rateSlider.step = "1";
  const rateValue = document.createElement("span");
  rateSlider.addEventListener("input", () => {
    const attacks = Number(rateSlider.value);
    window.__fx.openingAutomation.setBestAttackIntervalMs(attacksPerCycleToIntervalMs(attacks));
    rateValue.textContent = `${attacks}/cy`;
  });

  automationSection.append(
    makeRow(onButton, offButton, openingButton, infiniteButton, botModeSelect),
    makeRow(spendLabel, spendSlider, spendValue),
    makeRow(rateLabel, rateSlider, rateValue)
  );

  const openingSection = makeSection("Opening");
  const offsetLabel = document.createElement("span");
  offsetLabel.textContent = "Tick offset";
  const offsetInput = document.createElement("input");
  offsetInput.type = "number";
  offsetInput.step = "0.1";
  offsetInput.className = "fx-toolbox-input";
  const strategyInput = document.createElement("textarea");
  strategyInput.rows = 12;
  strategyInput.spellcheck = false;
  strategyInput.className = "fx-toolbox-input";
  const openingStatus = document.createElement("div");
  openingStatus.className = "fx-toolbox-status";

  function loadDefaultStrategy() {
    strategyInput.value = JSON.stringify(DEFAULT_OPENING_STRATEGY, null, 2);
    openingStatus.textContent = "Loaded default strategy";
    openingStatus.classList.remove("bad");
  }

  function validateOpening(showStatus = true) {
    const raw = strategyInput.value.trim();
    const offset = offsetInput.value.trim();
    try {
      if (raw) normalizeStrategy(JSON.parse(raw), openingTickOffsetToInternalTicks(offset));
      if (showStatus) {
        openingStatus.textContent = "Opening strategy is valid";
        openingStatus.classList.remove("bad");
      }
      return true;
    } catch (error) {
      openingStatus.textContent = `Invalid: ${error.message}`;
      openingStatus.classList.add("bad");
      return false;
    }
  }

  const validateButton = makeButton("Validate", () => validateOpening());
  function applyCurrentOpening() {
    if (!validateOpening()) return;
    const settings = getSettings();
    settings.openingAutomationTickOffset = offsetInput.value.trim();
    settings.openingAutomationStrategy = strategyInput.value.trim();
    persistSettings();
    const automation = window.__fx.openingAutomation;
    if (settings.openingAutomationEnabled) {
      automation.stop();
      automation.start();
      openingStatus.textContent = "Applied. Opening automation restarted.";
    } else {
      openingStatus.textContent = "Saved. Opening automation is currently off.";
    }
    openingStatus.classList.remove("bad");
    render();
  }
  const applyButton = makeButton("Apply & Restart", applyCurrentOpening);
  const defaultButton = makeButton("Load default", loadDefaultStrategy);

  const presetSelect = document.createElement("select");
  presetSelect.className = "fx-toolbox-input";
  presetSelect.style.flex = "1";
  const presetNameInput = document.createElement("input");
  presetNameInput.type = "text";
  presetNameInput.className = "fx-toolbox-input";
  presetNameInput.style.flex = "1";
  presetNameInput.placeholder = t("Preset name");
  const savePresetButton = makeButton(t("Save preset"), () => savePreset());
  const loadPresetButton = makeButton(t("Load"), () => loadPreset());
  const deletePresetButton = makeButton(t("Delete"), () => deletePreset());
  const presetRow = makeRow(presetSelect, presetNameInput, savePresetButton, loadPresetButton, deletePresetButton);

  function loadPresets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
      return Array.isArray(parsed)
        ? parsed.filter((preset) => preset && preset.name && typeof preset.strategy === "string")
        : [];
    } catch (_error) {
      return [];
    }
  }

  function storePresets(presets) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  }

  function renderPresets() {
    const presets = loadPresets();
    const selected = presetSelect.value;
    presetSelect.textContent = "";
    if (!presets.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = t("No saved openings");
      option.disabled = true;
      option.selected = true;
      presetSelect.append(option);
      return;
    }
    for (const preset of presets) {
      const option = document.createElement("option");
      option.value = preset.name;
      option.textContent = preset.name;
      option.dataset.noI18n = "1";
      presetSelect.append(option);
    }
    if (presets.some((preset) => preset.name === selected)) presetSelect.value = selected;
  }

  function savePreset() {
    if (!validateOpening()) return;
    const name = presetNameInput.value.trim() || presetSelect.value.trim();
    if (!name) {
      openingStatus.textContent = t("Enter a preset name");
      openingStatus.classList.add("bad");
      return;
    }
    const presets = loadPresets().filter((preset) => preset.name !== name);
    presets.push({ name, strategy: strategyInput.value.trim(), offset: offsetInput.value.trim() });
    storePresets(presets);
    presetNameInput.value = "";
    renderPresets();
    presetSelect.value = name;
    openingStatus.textContent = `${t("Preset saved")}: ${name}`;
    openingStatus.classList.remove("bad");
  }

  function loadPreset() {
    const preset = loadPresets().find((item) => item.name === presetSelect.value);
    if (!preset) return;
    strategyInput.value = preset.strategy;
    offsetInput.value = preset.offset || "-9.5";
    presetNameInput.value = preset.name;
    if (!validateOpening()) return;
    applyCurrentOpening();
    openingStatus.textContent = `${t("Loaded preset")}: ${preset.name}`;
    openingStatus.classList.remove("bad");
  }

  function deletePreset() {
    const name = presetSelect.value;
    if (!name) return;
    storePresets(loadPresets().filter((preset) => preset.name !== name));
    presetNameInput.value = "";
    renderPresets();
    openingStatus.textContent = `${t("Preset deleted")}: ${name}`;
    openingStatus.classList.remove("bad");
  }

  renderPresets();

  function ensureSettingsCloseButton() {
    const footer = document.querySelector(".window.settings footer");
    if (!footer || document.getElementById("fxToolboxSettingsClose")) return;
    const close = makeButton("Close", () => {
      window.__fx.WindowManager.closeWindow("settings");
      const automationPanel = document.getElementById("demonAutomationControls");
      if (automationPanel) automationPanel.style.display = "";
      close.remove();
    }, "fx-toolbox-close");
    close.id = "fxToolboxSettingsClose";
    footer.append(close);
  }

  function openFxSettings() {
    const settingsWindow = document.querySelector(".window.settings");
    const automationPanel = document.getElementById("demonAutomationControls");
    panel.classList.remove("open");
    if (settingsWindow) settingsWindow.style.setProperty("z-index", "2147483647", "important");
    if (automationPanel) automationPanel.style.display = "none";
    window.__fx.WindowManager.openWindow("settings");
    ensureSettingsCloseButton();
  }

  const settingsButton = makeButton("FX Settings", openFxSettings);

  openingSection.append(
    presetRow,
    makeRow(offsetLabel, offsetInput),
    strategyInput,
    makeRow(validateButton, applyButton, defaultButton, settingsButton),
    openingStatus,
    makeRow(Object.assign(document.createElement("span"), {
      className: "fx-toolbox-note",
      textContent: "Apply & Restart works in-game without reloading. FX Settings Save reloads the page."
    }))
  );

  const displaySection = makeSection("Display");
  const spawnAllButton = makeButton("All spawns", () => {
    const settings = getSettings();
    settings.showAllSpawnPoints = !settings.showAllSpawnPoints;
    persistSettings();
    render();
  });
  const spawnClanButton = makeButton("Clan spawns", () => {
    const settings = getSettings();
    settings.highlightClanSpawns = !settings.highlightClanSpawns;
    persistSettings();
    render();
  });
  const spawnNamesButton = makeButton("Spawn names", () => {
    const settings = getSettings();
    settings.showSpawnPointNames = !settings.showSpawnPointNames;
    persistSettings();
    render();
  });
  const clearSpawnButton = makeButton("Clear highlight", () => {
    window.__fx.selectedSpawnPlayer = -1;
  });
  const teamTagButton = makeButton("Team tags", () => {
    const settings = getSettings();
    settings.showTeamTags = !settings.showTeamTags;
    persistSettings();
    render();
  });
  const shipRoutesButton = makeButton("Ship routes", () => {
    const settings = getSettings();
    settings.showShipRoutes = !settings.showShipRoutes;
    persistSettings();
    render();
  });
  const nameSizeLabel = document.createElement("span");
  nameSizeLabel.textContent = "Name size";
  const nameSizeSlider = document.createElement("input");
  nameSizeSlider.type = "range";
  nameSizeSlider.min = "8";
  nameSizeSlider.max = "24";
  nameSizeSlider.step = "1";
  const nameSizeValue = document.createElement("span");
  nameSizeSlider.addEventListener("input", () => {
    const settings = getSettings();
    const size = Number(nameSizeSlider.value);
    settings.spawnPointNameSize = size;
    persistSettings();
    nameSizeValue.textContent = `${size}px`;
  });
  displaySection.append(
    makeRow(spawnAllButton, spawnClanButton, spawnNamesButton, teamTagButton, shipRoutesButton, clearSpawnButton),
    makeRow(nameSizeLabel, nameSizeSlider, nameSizeValue),
    makeRow(Object.assign(document.createElement("span"), {
      className: "fx-toolbox-note",
      textContent: "Spawn markers are shown during spawn selection."
    }))
  );

  const themeSection = makeSection("Theme");
  const animeThemeButton = makeButton("Anime theme", () => {
    const settings = getSettings();
    settings.animeThemeEnabled = !settings.animeThemeEnabled;
    persistSettings();
    window.__fx.theme?.apply?.();
    render();
  });
  themeSection.append(
    makeRow(animeThemeButton),
    makeRow(Object.assign(document.createElement("span"), {
      className: "fx-toolbox-note",
      textContent: "Pastel UI theme. The game canvas keeps its own colors."
    }))
  );

  const botSection = makeSection(t("Bot settings"));
  const botStatusLine = document.createElement("div");
  botStatusLine.className = "fx-toolbox-status";
  botStatusLine.textContent = t("Bot not loaded");

  function getBotTabMode() {
    return getHost()?.tabMode || null;
  }
  function getBotFx() {
    return getBotTabMode()?.getBotFx?.() || null;
  }
  function getBotAutomation() {
    const fx = getBotFx();
    return fx && fx.openingAutomation ? fx.openingAutomation : null;
  }
  function botAction(action) {
    const automation = getBotAutomation();
    if (!automation) return;
    action(automation);
    render();
  }

  const botReloadButton = makeButton(t("Reload bot"), () => getBotTabMode()?.reload?.());
  const botAllOnButton = makeButton(t("All On"), () => botAction((automation) => automation.setAllAutomationEnabled(true)));
  const botAllOffButton = makeButton(t("All Off"), () => botAction((automation) => automation.setAllAutomationEnabled(false)));
  const botOpeningButton = makeButton(t("Opening"), () => botAction((automation) => automation.toggleOpeningAutomationEnabled()));
  const botInfiniteButton = makeButton(t("Infinite"), () => botAction((automation) => automation.toggleInfiniteExpansion()));
  const tabBotModeSelect = document.createElement("select");
  tabBotModeSelect.className = "fx-toolbox-input";
  for (const mode of BOT_MODES) {
    const option = document.createElement("option");
    option.value = mode.value;
    option.textContent = mode.label;
    tabBotModeSelect.append(option);
  }
  tabBotModeSelect.addEventListener("change", () => {
    botAction((automation) => automation.setAutoAttackMode(tabBotModeSelect.value));
  });
  botSection.append(
    botStatusLine,
    makeRow(botReloadButton),
    makeRow(botAllOnButton, botAllOffButton, botOpeningButton, botInfiniteButton, tabBotModeSelect),
    makeRow(Object.assign(document.createElement("span"), {
      className: "fx-toolbox-note",
      textContent: t("Click the Bot button to load the bot. These controls apply only to that bot.")
    }))
  );

  const statusSection = makeSection("Status");
  const statusLine = document.createElement("div");
  statusLine.className = "fx-toolbox-status";
  const resetToggleButton = makeButton("Reset Tools button", () => {
    localStorage.removeItem(TOGGLE_POSITION_STORAGE_KEY);
    applyTogglePosition(8, 8, false);
  });
  const musicButton = makeButton(t("Music player"), () => getHost()?.music?.open?.() || window.__fx.musicPlayer?.open?.());
  statusSection.append(statusLine, makeRow(resetToggleButton, musicButton));

  body.append(automationSection);
  if (variant === "full") {
    if (embedded) body.append(botSection);
    body.append(openingSection, displaySection, themeSection, statusSection);
  }
  panel.append(header, body);

  function isInGame() {
    try {
      const gameState = Number(getVar("gameState") || 0);
      return (gameState === 1 || gameState === 2) && !getVar("gIsReplay");
    } catch (_error) {
      return false;
    }
  }

  function loadPosition() {
    try {
      const position = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || "null");
      if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return null;
      return position;
    } catch (_error) {
      return null;
    }
  }

  function clampPosition(left, top) {
    const rect = panel.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 240;
    return {
      left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - width)),
      top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - height))
    };
  }

  function applyPosition(left, top, persist = true) {
    const position = clampPosition(left, top);
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    panel.style.transform = "none";
    if (persist) localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }

  function applyInitialPosition() {
    const saved = loadPosition();
    if (saved) {
      applyPosition(saved.left, saved.top, false);
      return;
    }
    requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      const width = rect.width || 320;
      const height = rect.height || 240;
      applyPosition(
        Math.round((window.innerWidth - width) / 2),
        Math.round((window.innerHeight - height) / 2),
        false
      );
    });
  }

  function loadTogglePosition() {
    try {
      const position = JSON.parse(localStorage.getItem(TOGGLE_POSITION_STORAGE_KEY) || "null");
      if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return null;
      return position;
    } catch (_error) {
      return null;
    }
  }

  function clampTogglePosition(left, top) {
    const rect = toggle.getBoundingClientRect();
    const width = rect.width || 64;
    const height = rect.height || 32;
    return {
      left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - width)),
      top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - height))
    };
  }

  function applyTogglePosition(left, top, persist = true) {
    const position = clampTogglePosition(left, top);
    toggle.style.left = `${position.left}px`;
    toggle.style.top = `${position.top}px`;
    toggle.style.right = "auto";
    toggle.style.bottom = "auto";
    if (persist) localStorage.setItem(TOGGLE_POSITION_STORAGE_KEY, JSON.stringify(position));
  }

  function applyInitialTogglePosition() {
    const saved = loadTogglePosition();
    if (saved) {
      applyTogglePosition(saved.left, saved.top, false);
      return;
    }
    applyTogglePosition(8, 8, false);
  }

  let toggleDragState = null;
  let suppressToggleClick = false;
  toggle.addEventListener("pointerdown", (event) => {
    const rect = toggle.getBoundingClientRect();
    toggleDragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };
    toggle.setPointerCapture(event.pointerId);
    toggle.classList.add("dragging");
  });
  toggle.addEventListener("pointermove", (event) => {
    if (!toggleDragState || toggleDragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - toggleDragState.startX;
    const dy = event.clientY - toggleDragState.startY;
    if (!toggleDragState.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      toggleDragState.moved = true;
    }
    if (toggleDragState.moved) {
      applyTogglePosition(
        event.clientX - toggleDragState.offsetX,
        event.clientY - toggleDragState.offsetY,
        false
      );
    }
  });
  const finishToggleDrag = (event) => {
    if (!toggleDragState || toggleDragState.pointerId !== event.pointerId) return;
    const moved = toggleDragState.moved;
    toggleDragState = null;
    toggle.classList.remove("dragging");
    if (moved) {
      const rect = toggle.getBoundingClientRect();
      applyTogglePosition(rect.left, rect.top, true);
      suppressToggleClick = true;
      setTimeout(() => {
        suppressToggleClick = false;
      }, 0);
    }
  };
  toggle.addEventListener("pointerup", finishToggleDrag);
  toggle.addEventListener("pointercancel", finishToggleDrag);

  let dragState = null;
  header.addEventListener("pointerdown", (event) => {
    if (event.target === closeButton) return;
    const rect = panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  header.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    applyPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
  });
  const stopDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragState = null;
  };
  header.addEventListener("pointerup", stopDrag);
  header.addEventListener("pointercancel", stopDrag);

  function openPanel() {
    if (!document.body.contains(panel)) document.body.append(panel);
    panel.classList.add("open");
    if (!panel.style.left) applyInitialPosition();
    const settings = getSettings();
    offsetInput.value = settings.openingAutomationTickOffset || "-9.5";
    strategyInput.value = settings.openingAutomationStrategy || JSON.stringify(DEFAULT_OPENING_STRATEGY, null, 2);
    openingStatus.textContent = "";
    openingStatus.classList.remove("bad");
    render();
  }

  function togglePanel() {
    if (panel.classList.contains("open")) panel.classList.remove("open");
    else openPanel();
  }

  toggle.addEventListener("click", (event) => {
    if (suppressToggleClick) {
      suppressToggleClick = false;
      event.preventDefault();
      return;
    }
    togglePanel();
  });

  function render() {
    if (!document.body.contains(toggle)) {
      document.body.append(toggle);
      applyInitialTogglePosition();
    }
    if (!document.body.contains(panel)) document.body.append(panel);
    const settings = getSettings();
    const automation = window.__fx.openingAutomation;
    const mode = automation.getAutoAttackMode();
    openingButton.classList.toggle("active", Boolean(settings.openingAutomationEnabled));
    infiniteButton.classList.toggle("active", Boolean(settings.infiniteExpansionEnabled));
    onButton.classList.toggle("active", Boolean(settings.openingAutomationEnabled && settings.infiniteExpansionEnabled && mode !== "off"));
    offButton.classList.toggle("active", !settings.openingAutomationEnabled && !settings.infiniteExpansionEnabled && mode === "off");
    botModeSelect.value = mode;
    spawnAllButton.classList.toggle("active", Boolean(settings.showAllSpawnPoints));
    spawnClanButton.classList.toggle("active", Boolean(settings.highlightClanSpawns));
    spawnNamesButton.classList.toggle("active", Boolean(settings.showSpawnPointNames));
    teamTagButton.classList.toggle("active", Boolean(settings.showTeamTags));
    shipRoutesButton.classList.toggle("active", Boolean(settings.showShipRoutes));
    const nameSize = Number(settings.spawnPointNameSize) || 12;
    nameSizeSlider.value = String(nameSize);
    nameSizeValue.textContent = `${nameSize}px`;
    animeThemeButton.classList.toggle("active", Boolean(settings.animeThemeEnabled));
    const spend = automation.getBotSpendPercent();
    spendSlider.value = String(spend);
    spendValue.textContent = `${spend}%`;
    const attacks = intervalMsToAttacksPerCycle(automation.getBestAttackIntervalMs());
    rateSlider.value = String(attacks);
    rateValue.textContent = `${attacks}/cy`;
    const tick = Number(automation.lastTick ?? -1);
    const attackCount = Array.isArray(automation.attacks) ? automation.attacks.length : 0;
    statusLine.textContent = `tick ${tick} · opening ${settings.openingAutomationEnabled ? "on" : "off"} · infinite ${settings.infiniteExpansionEnabled ? "on" : "off"} · bot ${mode} · opening attacks ${attackCount}`;
    const shipState = window.__fx.shipRouteStatus;
    if (shipState) statusLine.textContent += ` · ships ${shipState.ships} · paths ${shipState.paths ?? '-'} · routes ${shipState.routes}`;

    if (variant === "full" && embedded) {
      const botFx = getBotFx();
      const botAutomation = botFx && botFx.openingAutomation ? botFx.openingAutomation : null;
      const botSettings = botFx && botFx.settings ? botFx.settings : null;
      const botLoaded = Boolean(botAutomation);
      for (const button of [botAllOnButton, botAllOffButton, botOpeningButton, botInfiniteButton]) {
        button.disabled = !botLoaded;
      }
      botReloadButton.disabled = !getBotTabMode();
      tabBotModeSelect.disabled = !botLoaded;

      if (!getBotTabMode()) {
        botStatusLine.textContent = t("Tab Mode unavailable");
        botStatusLine.classList.add("bad");
      } else if (!botLoaded) {
        botStatusLine.textContent = t("Bot not loaded · click the Bot button to load it");
        botStatusLine.classList.add("bad");
      } else {
        botStatusLine.classList.remove("bad");
        const botTick = Number(botAutomation.lastTick ?? -1);
        const botMode = botAutomation.getAutoAttackMode();
        tabBotModeSelect.value = botMode;
        botAllOnButton.classList.toggle("active", Boolean(botSettings?.openingAutomationEnabled && botSettings?.infiniteExpansionEnabled && botMode !== "off"));
        botAllOffButton.classList.toggle("active", !botSettings?.openingAutomationEnabled && !botSettings?.infiniteExpansionEnabled && botMode === "off");
        botOpeningButton.classList.toggle("active", Boolean(botSettings?.openingAutomationEnabled));
        botInfiniteButton.classList.toggle("active", Boolean(botSettings?.infiniteExpansionEnabled));
        botStatusLine.textContent =
          `${t("Bot ready")} · tick ${botTick} · ` +
          `${t("Opening")} ${botSettings?.openingAutomationEnabled ? t("On") : t("Off")} · ` +
          `${t("Infinite")} ${botSettings?.infiniteExpansionEnabled ? t("On") : t("Off")} · ` +
          `${t("Bot")} ${botMode}`;
      }
    }
  }

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (event.key === "F2") {
      event.preventDefault();
      togglePanel();
    } else if (event.key === "Escape" && panel.classList.contains("open")) {
      panel.classList.remove("open");
    }
  });

  window.addEventListener("resize", () => {
    if (panel.style.left) {
      const rect = panel.getBoundingClientRect();
      applyPosition(rect.left, rect.top);
    }
    if (toggle.style.left) {
      const rect = toggle.getBoundingClientRect();
      applyTogglePosition(rect.left, rect.top, false);
    }
  });

  window.addEventListener("load", render);
  setTimeout(render, 1000);
  setInterval(render, 500);
  render();

  return { render, open: openPanel, close: () => panel.classList.remove("open") };
}
