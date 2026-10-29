import { t } from "./i18n.js";
import WindowManager from "./windowManager.js";

const TEAM_PALETTE = [
  null,
  { name: "Red", rgb: [255, 0, 0], css: "#ff0000" },
  { name: "Green", rgb: [0, 255, 0], css: "#00ff00" },
  { name: "Blue", rgb: [0, 0, 255], css: "#0000ff" },
  { name: "Yellow", rgb: [255, 255, 0], css: "#ffff00" },
  { name: "Magenta", rgb: [255, 0, 255], css: "#ff00ff" },
  { name: "Cyan", rgb: [0, 255, 255], css: "#00ffff" },
  { name: "White", rgb: [255, 255, 255], css: "#ffffff" },
  { name: "Black", rgb: [0, 0, 0], css: "#111111" },
];

function roundDiv(value, divisor) {
  return Math.floor((value + 0.5) / divisor);
}

function clanTag(name) {
  const text = String(name || "");
  const start = text.indexOf("[");
  if (start < 0) return null;
  const end = text.indexOf("]");
  if (end - start > 1 && end - start <= 8) {
    return text.slice(start + 1, end).toUpperCase().trim();
  }
  return null;
}

function colorParts(value) {
  const color = Number(value) || 0;
  return [4 * (color >> 12), 4 * ((color >> 6) & 63), 4 * (color & 63)];
}

export function solveTeamSlots(players, teamCount) {
  const list = Array.isArray(players) ? players : [];
  const humans = list.length;
  if (humans === 0) return { teamOf: [], slotColor: [] };

  let teams = Math.max(2, Math.min(8, Number(teamCount) || 2));
  const nearest = new Array(humans).fill(0);
  const second = new Array(humans).fill(0);
  const counts = new Array(8).fill(0);
  const distances = new Array(8).fill(0);

  for (let ai = 0; ai < humans; ai += 1) {
    const [r, g, b] = colorParts(list[ai].color);
    for (let color = 8; color >= 1; color -= 1) {
      const palette = TEAM_PALETTE[color].rgb;
      distances[color - 1] =
        Math.abs(r - palette[0]) + Math.abs(g - palette[1]) + Math.abs(b - palette[2]);
    }

    let bestDistance = 768;
    for (let slot = 7; slot >= 0; slot -= 1) {
      const candidate = (slot + ai) % 8;
      if (distances[candidate] < bestDistance) {
        bestDistance = distances[candidate];
        nearest[ai] = candidate;
      }
    }

    bestDistance = 768;
    for (let slot = 7; slot >= 0; slot -= 1) {
      const candidate = (slot + ai) % 8;
      if (distances[candidate] < bestDistance && candidate !== nearest[ai]) {
        bestDistance = distances[candidate];
        second[ai] = candidate;
      }
    }

    counts[nearest[ai]] += 4;
    counts[second[ai]] += 1;
  }

  const slotColor = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let slot = 7; slot >= 0; slot -= 1) counts[slot] += 1;
  for (let slot = 1; slot <= 8; slot += 1) {
    let best = 0;
    for (let candidate = 1; candidate < 8; candidate += 1) {
      if (counts[candidate] > counts[best]) best = candidate;
    }
    counts[best] = 0;
    slotColor[slot] = best + 1;
  }

  const teamOf = new Array(humans).fill(0);
  const teamCounts = new Array(9).fill(0);
  const clans = [];
  const clanPlayers = [];
  const clanDone = [];
  let largestClan = 0;

  for (let ai = 0; ai < humans; ai += 1) {
    const tag = clanTag(list[ai].name);
    if (tag === null) continue;
    let found = false;
    for (let index = clans.length - 1; index >= 0; index -= 1) {
      if (tag === clans[index]) {
        clanPlayers[index].push(ai);
        largestClan = Math.max(largestClan, clanPlayers[index].length);
        found = true;
        break;
      }
    }
    if (found) continue;
    clans.push(tag);
    clanDone.push(false);
    clanPlayers.push([ai]);
    largestClan = Math.max(largestClan, 1);
  }

  while (teams > 2 && largestClan > roundDiv(humans, teams)) teams -= 1;

  const preferences = new Array(8).fill(0);
  for (let clan = clans.length - 1; clan >= 0; clan -= 1) {
    let chosen = -1;
    for (let candidate = clans.length - 1; candidate >= 0; candidate -= 1) {
      if (!clanDone[candidate] && (chosen === -1 || clanPlayers[candidate].length > clanPlayers[chosen].length)) {
        chosen = candidate;
      }
    }
    if (chosen === -1) continue;

    for (let index = 7; index >= 0; index -= 1) preferences[index] = 1;
    for (let index = clanPlayers[chosen].length - 1; index >= 0; index -= 1) {
      const player = clanPlayers[chosen][index];
      preferences[nearest[player]] += 3;
      preferences[second[player]] += 1;
    }

    for (let attempt = 7; attempt >= 0; attempt -= 1) {
      let best = chosen % 8;
      for (let candidate = 7; candidate >= 0; candidate -= 1) {
        if (preferences[candidate] > preferences[best]) best = candidate;
      }

      let team = -1;
      for (let slot = teams; slot > 0; slot -= 1) {
        if (slotColor[slot] === best + 1) {
          team = slot;
          break;
        }
      }
      preferences[best] = 0;
      if (team === -1) continue;

      let larger = 0;
      for (let slot = teams; slot > 0; slot -= 1) {
        if (teamCounts[team] > teamCounts[slot]) larger += 1;
      }
      if (larger === teams - 1) continue;

      for (let index = clanPlayers[chosen].length - 1; index >= 0; index -= 1) {
        teamCounts[team] += 1;
        teamOf[clanPlayers[chosen][index]] = team;
      }
      break;
    }
    clanDone[chosen] = true;
  }

  let border = roundDiv(humans, teams);
  if (humans % teams > 0) border += 1;
  const colorToSlot = new Array(9).fill(0);
  for (let slot = 8; slot >= 1; slot -= 1) colorToSlot[slotColor[slot]] = slot;

  for (let ai = 0; ai < humans; ai += 1) {
    const slot = colorToSlot[nearest[ai] + 1];
    if (teamOf[ai] === 0 && slot <= teams && teamCounts[slot] < border) {
      teamCounts[slot] += 1;
      teamOf[ai] = slot;
    }
  }
  for (let ai = 0; ai < humans; ai += 1) {
    const slot = colorToSlot[second[ai] + 1];
    if (teamOf[ai] === 0 && slot <= teams && teamCounts[slot] < border) {
      teamCounts[slot] += 1;
      teamOf[ai] = slot;
    }
  }
  for (let slot = teams; slot >= 1; slot -= 1) {
    for (let ai = humans - 1; ai >= 0; ai -= 1) {
      if (teamCounts[slot] >= border) break;
      if (teamOf[ai] === 0) {
        teamCounts[slot] += 1;
        teamOf[ai] = slot;
      }
    }
  }

  return { teamOf, slotColor };
}

export function solveTeamGroups(players, teamCount) {
  const list = Array.isArray(players) ? players : [];
  const requested = Math.max(2, Math.min(8, Number(teamCount) || 2));
  const { teamOf, slotColor } = solveTeamSlots(list, requested);
  const groups = [];
  for (let slot = 1; slot <= requested; slot += 1) {
    const color = TEAM_PALETTE[slotColor[slot]] || null;
    groups.push({
      team: slot,
      name: `Team ${slot}`,
      css: color ? color.css : "#888888",
      players: [],
    });
  }

  const unassigned = [];
  for (let ai = 0; ai < list.length; ai += 1) {
    const slot = teamOf[ai];
    const name = String(list[ai].name || "");
    if (slot >= 1 && slot <= requested) groups[slot - 1].players.push(name);
    else unassigned.push(name);
  }
  if (unassigned.length) {
    groups.push({ team: 0, name: "Unassigned", css: "#888888", players: unassigned });
  }
  return groups;
}

function makeDraggable(element, handle) {
  handle.style.cursor = "move";
  handle.style.userSelect = "none";
  handle.style.touchAction = "none";
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  function start(x, y) {
    const rect = element.getBoundingClientRect();
    startX = x;
    startY = y;
    startLeft = rect.left;
    startTop = rect.top;
    element.style.left = `${rect.left}px`;
    element.style.top = `${rect.top}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
    element.style.margin = "0";
    element.style.transform = "none";
    dragging = true;
  }

  function move(x, y) {
    if (!dragging) return;
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, Math.min(startLeft + x - startX, window.innerWidth - rect.width));
    const top = Math.max(0, Math.min(startTop + y - startY, window.innerHeight - rect.height));
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function end() {
    dragging = false;
  }

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    start(event.clientX, event.clientY);
  });
  document.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    event.preventDefault();
    move(event.clientX, event.clientY);
  });
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  handle.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    start(touch.clientX, touch.clientY);
  }, { passive: false });
  document.addEventListener("touchmove", (event) => {
    if (!dragging) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    move(touch.clientX, touch.clientY);
  }, { passive: false });
  document.addEventListener("touchend", end);
  document.addEventListener("touchcancel", end);
}

function createWindow() {
  const element = WindowManager.create({ name: "lobbyTeams", classes: "scrollable selectable", closable: false });
  element.style.width = "min(360px, 90vw)";
  element.style.maxHeight = "55vh";
  element.style.marginTop = "10vh";
  element.style.padding = "10px 12px";
  element.style.fontSize = "14px";
  element.style.borderWidth = "2px";
  element.style.transition = "none";

  const title = document.createElement("h1");
  title.id = "fxLobbyTeamsTitle";
  title.textContent = t("Team split");
  title.style.fontSize = "18px";
  title.style.margin = "0 0 8px";
  makeDraggable(element, title);

  const body = document.createElement("div");
  body.id = "fxLobbyTeamsBody";
  body.style.padding = "0 10px 10px";

  element.append(title, body);
  return { element, title, body };
}

export default function initLobbyTeams() {
  const { title, body } = createWindow();
  let toggleButton = null;
  let refreshTimer = null;
  let invalidSince = null;
  let lastToggleAt = 0;

  function hostState() {
    return window.__fx?.lobbyTeamsHost?.getState?.() || null;
  }

  function stopRefresh() {
    if (refreshTimer !== null) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function closePanel() {
    WindowManager.closeWindow("lobbyTeams");
    stopRefresh();
  }

  function render() {
    const state = hostState();
    if (!state || state.mode >= 7) {
      if (invalidSince === null) invalidSince = Date.now();
      if (Date.now() - invalidSince > 4000) {
        closePanel();
        return;
      }
      title.textContent = t("Team split");
      body.textContent = "";
      const message = document.createElement("div");
      message.className = "fx-lobby-teams-empty";
      message.textContent = t(!state ? "No lobby data" : "Not a team lobby");
      body.appendChild(message);
      return;
    }
    invalidSince = null;

    title.textContent = `${t("Team split")} · ${state.ready}`;
    body.textContent = "";

    if (!state.ready) {
      const empty = document.createElement("div");
      empty.className = "fx-lobby-teams-empty";
      empty.textContent = t("No ready players");
      body.appendChild(empty);
      return;
    }

    const groups = solveTeamGroups(state.players, state.mode + 2);
    const fragment = document.createDocumentFragment();
    for (const group of groups) {
      const row = document.createElement("div");
      row.className = "fx-lobby-team-row";

      const dot = document.createElement("span");
      dot.className = "fx-lobby-team-dot";
      dot.style.backgroundColor = group.css;

      const name = document.createElement("span");
      name.className = "fx-lobby-team-name";
      name.textContent = group.team ? `${t("Team")} ${group.team}` : t(group.name);

      const colon = document.createElement("span");
      colon.className = "fx-lobby-team-colon";
      colon.textContent = ":";

      const players = document.createElement("span");
      players.className = "fx-lobby-team-players";
      players.textContent = group.players.join(", ");

      row.append(dot, name, colon, players);
      fragment.appendChild(row);
    }
    body.appendChild(fragment);
  }

  function openPanel() {
    invalidSince = null;
    WindowManager.openWindow("lobbyTeams");
    stopRefresh();
    render();
    if (WindowManager.isWindowOpen("lobbyTeams")) refreshTimer = setInterval(render, 500);
  }

  function togglePanel() {
    const now = Date.now();
    if (now - lastToggleAt < 250) return;
    lastToggleAt = now;
    if (WindowManager.isWindowOpen("lobbyTeams")) closePanel();
    else openPanel();
  }

  return {
    toggle: togglePanel,
    setAnchor(button) {
      toggleButton = button || null;
    },
    close: closePanel,
  };
}
