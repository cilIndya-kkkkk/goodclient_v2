import { t } from "./i18n.js";

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

function createPanel() {
  const panel = document.createElement("div");
  panel.id = "fxLobbyTeams";
  Object.assign(panel.style, {
    position: "fixed",
    zIndex: "2147483647",
    display: "none",
    flexDirection: "column",
    width: "min(420px, 92vw)",
    maxHeight: "45vh",
    background: "rgba(9, 13, 18, 0.97)",
    border: "1px solid rgba(110, 210, 160, 0.55)",
    boxShadow: "0 0 24px rgba(0, 0, 0, 0.75)",
    color: "#dbe7f0",
    fontFamily: "'Trebuchet MS', Arial, sans-serif",
    fontSize: "13px",
  });

  const header = document.createElement("div");
  header.id = "fxLobbyTeamsHeader";
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    padding: "6px 9px",
    background: "rgba(20, 34, 28, 0.95)",
    borderBottom: "1px solid rgba(110, 210, 160, 0.35)",
    color: "#a8f0c8",
    fontSize: "12px",
    fontWeight: "700",
  });

  const title = document.createElement("span");
  title.id = "fxLobbyTeamsTitle";

  const close = document.createElement("button");
  close.type = "button";
  close.id = "fxLobbyTeamsClose";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");
  Object.assign(close.style, {
    flex: "0 0 auto",
    width: "22px",
    height: "22px",
    padding: "0",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    background: "rgba(0, 0, 0, 0.35)",
    color: "#dbe7f0",
    font: "inherit",
    fontSize: "16px",
    lineHeight: "1",
    cursor: "pointer",
  });

  header.append(title, close);

  const body = document.createElement("div");
  body.id = "fxLobbyTeamsBody";
  Object.assign(body.style, {
    flex: "1",
    minHeight: "0",
    overflowY: "auto",
    padding: "7px 10px 9px",
  });

  panel.append(header, body);
  document.body.appendChild(panel);

  return { panel, title, body, close };
}

export default function initLobbyTeams() {
  const { panel, title, body, close } = createPanel();
  let toggleButton = null;
  let toggleRow = null;
  let toggleHandler = null;
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
    panel.classList.remove("open");
    panel.style.display = "none";
    stopRefresh();
  }

  function positionPanel() {
    if (!panel.classList.contains("open")) return;
    const width = Math.min(420, window.innerWidth - 16);
    panel.style.width = `${width}px`;

    const rect = toggleButton?.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.bottom > 0) {
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 120));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
    } else {
      panel.style.left = "50%";
      panel.style.top = "auto";
      panel.style.right = "auto";
      panel.style.bottom = "12px";
      panel.style.transform = "translateX(-50%)";
    }
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
    panel.classList.add("open");
    panel.style.display = "flex";
    positionPanel();
    stopRefresh();
    render();
    if (panel.classList.contains("open")) refreshTimer = setInterval(render, 500);
  }

  function togglePanel() {
    const now = Date.now();
    if (now - lastToggleAt < 250) return;
    lastToggleAt = now;
    if (panel.classList.contains("open")) {
      const rect = panel.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 &&
        rect.bottom > 0 && rect.top < window.innerHeight &&
        rect.right > 0 && rect.left < window.innerWidth;
      if (visible) {
        closePanel();
        return;
      }
    }
    openPanel();
  }

  function registerToggleButton(button, row) {
    if (toggleRow && toggleHandler) {
      toggleRow.removeEventListener("click", toggleHandler);
    } else if (toggleButton && toggleHandler) {
      toggleButton.removeEventListener("click", toggleHandler);
    }

    toggleButton = button || null;
    toggleRow = row || null;
    toggleHandler = (event) => {
      if (toggleRow && toggleButton) {
        const rect = toggleButton.getBoundingClientRect();
        if (event.clientX > rect.right + 4) return;
      }
      togglePanel();
    };

    if (toggleRow) toggleRow.addEventListener("click", toggleHandler);
    else if (toggleButton) toggleButton.addEventListener("click", toggleHandler);
  }

  close.addEventListener("click", (event) => {
    event.stopPropagation();
    closePanel();
  });

  window.addEventListener("resize", positionPanel);

  return {
    toggle: togglePanel,
    setAnchor(button) {
      toggleButton = button || null;
    },
    registerToggleButton,
    close: closePanel,
  };
}
