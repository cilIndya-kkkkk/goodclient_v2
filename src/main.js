import openingAutomation, { OpeningAutomationInput } from './openingAutomation.js';
import initAutomationControls from './automationControls.js';
import initToolbox from './toolbox.js';
import initMusicPlayer from './musicPlayer.js';
import initTheme from './theme.js';
import { getTeamTag } from './teamTags.js';
import initShipRoutes from './shipRoutes.js';
import initTabMode from './tabMode.js';
import { reportError } from './debugging.js';
import { initI18n } from './i18n.js';
import { isBotInstance, isEmbedded } from './instance.js';
import initCleanView from './cleanView.js';

window.__fx = window.__fx || {};
window.__fx.reportError = reportError;

import versionData from '../version.json';
const { version, lastUpdated, isSignificant } = versionData;

import settingsManager from './settings.js';
import { clanFilter, leaderboardFilter } from "./clanFilters.js";
import WindowManager from "./windowManager.js";
import donationsTracker from "./donationsTracker.js";
import winCounter from "./winCounter.js";
import playerList from "./playerList.js";
import initLobbyTeams from "./lobbyTeams.js";
import gameScriptUtils from "./gameScriptUtils.js";
import hoveringTooltip from "./hoveringTooltip.js";
import { keybindFunctions, keybindHandler, mobileKeybinds } from "./keybinds.js";
import customLobby from './customLobby.js';
import { displayChangelog } from './changelog.js';
import replayHistory from './replayHistory.js';
import replay from './replay.js';
import lobbyReminders from './lobbyReminders.js';
import pingFilter from './pingFilter.js';
import nameFilter from './nameFilter.js';
import followedAccounts from './followedAccounts.js';

window.__fx = window.__fx || {};
const __fx = window.__fx;
const isTabBot = isBotInstance();
const embedded = isEmbedded();
initI18n();
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = (reason && reason.message) || "";
  if (reason && (reason.name === "AbortError" || /play\(\) request was interrupted/i.test(message))) {
    event.preventDefault();
  }
});
__fx.version = version + " " + lastUpdated;
__fx.isCustomLobbyVersion = window.location.href.startsWith("https://fxclient.github.io/custom-lobbies")
const relayParam = new URLSearchParams(window.location.search).get("relay") || "";
__fx.relayBase = /^wss?:\/\//i.test(relayParam) ? relayParam : "";

const savedVersion = localStorage.getItem("fx_version");
if (savedVersion !== version && !__fx.isCustomLobbyVersion) {
  localStorage.setItem("fx_version", version);
  if (savedVersion !== null && isSignificant) displayChangelog();
}

__fx.settingsManager = settingsManager;
__fx.leaderboardFilter = leaderboardFilter;
__fx.utils = gameScriptUtils;
__fx.WindowManager = WindowManager;
__fx.keybindFunctions = keybindFunctions;
__fx.keybindHandler = keybindHandler;
__fx.mobileKeybinds = mobileKeybinds;
__fx.donationsTracker = donationsTracker;
__fx.reportError = reportError;
__fx.playerList = playerList;
__fx.hoveringTooltip = hoveringTooltip;
__fx.clanFilter = clanFilter;
__fx.wins = winCounter;
__fx.customLobby = customLobby;
__fx.replayHistory = replayHistory;
__fx.replay = replay;
__fx.lobbyReminders = lobbyReminders;
__fx.lobbyTeams = initLobbyTeams();
__fx.pingFilter = pingFilter;
__fx.nameFilter = nameFilter;
__fx.followedAccounts = followedAccounts;

__fx.openingAutomation = openingAutomation;
__fx.OpeningAutomationInput = OpeningAutomationInput;
__fx.automationControls = isTabBot ? null : initAutomationControls();
__fx.theme = isTabBot ? null : initTheme();
__fx.shipRoutes = isTabBot ? null : initShipRoutes();
__fx.tabMode = initTabMode();
__fx.cleanView = initCleanView();
if (isTabBot) __fx.cleanView.setEnabled(true, { hideFx: true, lowDpr: true });
__fx.toolbox = initToolbox({ variant: isTabBot ? "bot" : "full" });
if (isTabBot || embedded) {
  __fx.musicPlayer = null;
} else {
  try {
    __fx.musicPlayer = initMusicPlayer();
    console.log("Music player ready");
  } catch (error) {
    console.error("Music player failed to initialize", error);
  }
}
__fx.isBotInstance = isBotInstance;
__fx.isEmbedded = () => isEmbedded();
__fx.getTeamTag = getTeamTag;
__fx.selectedSpawnPlayer = -1;
__fx.onLeaderboardPlayerClick = (player) => {
  __fx.selectedSpawnPlayer = Number(player);
};

console.log('Successfully loaded FX Client');
