import { getVar } from "./gameInterface.js";
import { getSettings } from "./settings.js";

const INTEL_INTERVAL_MS = 250;
const LOOKAHEAD_POINTS = 18;
const BLOCK_RADIUS_TILES = 2.2;
const ATTACKER_RADIUS_TILES = 8;
const INTERCEPT_PROGRESS = 0.9;
const INTERCEPT_MARGIN = 1.05;

let lastIntelAt = 0;
let lastAutoAt = 0;
let recalledIndices = new Set();
let pendingRecalls = new Set();
let interceptedKeys = new Set();
let pendingKeys = new Set();

function myPlayer() {
  return Number(getVar("playerId")) || 0;
}

function totalTroops() {
  const balances = getVar("playerBalances") || [];
  return Number(balances[myPlayer()]) || 0;
}

function playerName(player) {
  const names = getVar("rawPlayerNames") || [];
  return String(names[player] || `Player ${player}`);
}

function ownerOf(state, index) {
  return (Number(state.j6?.[index]) || 0) >> 3;
}

function troopsOf(state, index) {
  return Number(state.zg?.[index]) || 0;
}

function statusOf(state, index) {
  return Number(state.shipStatus?.[index]) || 0;
}

function isReturning(state, index) {
  return statusOf(state, index) % 64 === 5;
}

function tilePoint(state, packed) {
  const mapWidth = Number(state.mapWidth) || 0;
  if (!mapWidth || !Number.isFinite(Number(packed))) return null;
  const stride = mapWidth * 16;
  return {
    x: (Number(packed) % stride) / 16,
    y: Math.floor(Number(packed) / stride) / 16,
  };
}

function distance(left, right) {
  if (!left || !right) return Infinity;
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isEnemy(player) {
  if (player === myPlayer()) return false;
  const api = window.__fx && window.__fx.openingAutomation;
  if (api && typeof api.canAttackTarget === "function") {
    try {
      return Boolean(api.canAttackTarget(player));
    } catch (_error) {}
  }
  return true;
}

function shipProgress(state, index) {
  if (Array.isArray(state.progress) && Number.isFinite(state.progress[index])) {
    return state.progress[index];
  }
  const route = state.routes?.[index];
  const length = route && Number.isFinite(route.length) ? route.length : 0;
  if (length <= 1) return 1;
  const routeIndex = Number(state.routeIndex?.[index]) || 0;
  const segment = Number(state.segmentProgress?.[index]) || 0;
  return Math.min(1, Math.max(0, (routeIndex + Math.min(1, Math.max(0, segment / 65535))) / (length - 1)));
}

function routePoint(state, value) {
  const packed = typeof state.zt === "function" ? state.zt(value) : value;
  return tilePoint(state, packed);
}

function routeAhead(state, index, count) {
  const route = state.routes?.[index];
  if (!Array.isArray(route)) return [];
  const start = Math.max(1, (Number(state.routeIndex?.[index]) || 0) + 1);
  const end = Math.min(route.length, start + count);
  const points = [];
  for (let pointIndex = start; pointIndex < end; pointIndex++) {
    const point = routePoint(state, route[pointIndex]);
    if (point) points.push(point);
  }
  return points;
}

function threatRadius(state, index) {
  return tilePoint(state, state.iz?.[index]);
}

function updateShipIntel(state) {
  if (!state) return null;
  const now = Date.now();
  if (now - lastIntelAt < INTEL_INTERVAL_MS) return window.__fx.shipIntel || null;
  lastIntelAt = now;

  const me = myPlayer();
  const myTroops = totalTroops();
  const shipCount = Math.max(0, Math.floor(Number(state.jO) || 0));
  const myShips = [];
  const attackersByShip = new Map();
  const activeRecalled = new Set();
  const activeAttackers = new Set();

  for (let index = 0; index < shipCount; index++) {
    if (ownerOf(state, index) !== me) continue;
    const progress = shipProgress(state, index);
    myShips.push({
      index,
      troops: troopsOf(state, index),
      progress,
      returning: isReturning(state, index),
      attackers: [],
      blockers: [],
    });
  }

  const enemyShips = [];
  for (let index = 0; index < shipCount; index++) {
    const owner = ownerOf(state, index);
    if (owner === me || isReturning(state, index)) continue;
    if (!isEnemy(owner)) continue;
    enemyShips.push({
      index,
      owner,
      troops: troopsOf(state, index),
      progress: shipProgress(state, index),
      point: threatRadius(state, index),
      route: state.routes?.[index],
    });
  }

  for (const mine of myShips) {
    const minePoint = threatRadius(state, mine.index);
    const ahead = routeAhead(state, mine.index, LOOKAHEAD_POINTS);
    for (const enemy of enemyShips) {
      const key = `${enemy.index}:${enemy.owner}`;
      let attacking = false;
      if (minePoint && enemy.point && distance(minePoint, enemy.point) <= ATTACKER_RADIUS_TILES) {
        attacking = true;
      }
      if (!attacking) {
        for (const point of ahead) {
          if (distance(point, enemy.point) <= ATTACKER_RADIUS_TILES) {
            attacking = true;
            break;
          }
        }
      }
      if (!attacking && enemy.route && enemy.route.length) {
        const end = routePoint(state, enemy.route[enemy.route.length - 1]);
        if (minePoint && distance(minePoint, end) <= ATTACKER_RADIUS_TILES) attacking = true;
      }
      if (!attacking) continue;
      activeAttackers.add(key);
      mine.attackers.push({
        index: enemy.index,
        player: enemy.owner,
        name: playerName(enemy.owner),
        troops: enemy.troops,
        progress: enemy.progress,
        insufficient: myTroops * INTERCEPT_MARGIN < enemy.troops,
      });
    }

    for (const enemy of enemyShips) {
      if (enemy.troops <= mine.troops) continue;
      let blocking = false;
      for (const point of ahead) {
        if (distance(point, enemy.point) <= BLOCK_RADIUS_TILES) {
          blocking = true;
          break;
        }
      }
      if (!blocking) continue;
      mine.blockers.push({
        index: enemy.index,
        player: enemy.owner,
        name: playerName(enemy.owner),
        troops: enemy.troops,
      });
    }
  }

  const intel = {
    updatedAt: now,
    myPlayer: me,
    myTotalTroops: myTroops,
    myShips,
    shipCount,
  };
  window.__fx.shipIntel = intel;

  const settings = getSettings();
  const activeShips = new Set(myShips.map((ship) => ship.index));
  for (const ship of myShips) {
    if (!settings.autoRecallBlockedShips || ship.returning || !ship.blockers.length) continue;
    if (!recalledIndices.has(ship.index)) pendingRecalls.add(ship.index);
  }
  for (const index of [...recalledIndices]) {
    if (!activeShips.has(index)) recalledIndices.delete(index);
  }
  for (const index of [...pendingRecalls]) {
    if (!activeShips.has(index)) pendingRecalls.delete(index);
  }

  for (const key of [...interceptedKeys]) {
    if (!activeAttackers.has(key)) interceptedKeys.delete(key);
  }
  for (const key of [...pendingKeys]) {
    if (!activeAttackers.has(key)) pendingKeys.delete(key);
  }

  return intel;
}

function attackerByKey(intel, key) {
  if (!intel) return null;
  for (const ship of intel.myShips) {
    for (const attacker of ship.attackers) {
      if (`${attacker.index}:${attacker.player}` === key) return attacker;
    }
  }
  return null;
}

function tryIntercept(attacker, intel) {
  if (!attacker || !intel) return false;
  if (attacker.progress < INTERCEPT_PROGRESS) return false;
  const myTroops = Number(intel.myTotalTroops) || 0;
  const needed = Number(attacker.troops) * INTERCEPT_MARGIN;
  if (!myTroops || myTroops < needed) return false;
  const key = `${attacker.index}:${attacker.player}`;
  if (interceptedKeys.has(key)) return false;
  const control = window.__fx.shipControl;
  if (!control || typeof control.interceptShip !== "function") return false;
  const percent = Math.min(1, needed / myTroops);
  if (!control.interceptShip(attacker.index, percent)) return false;
  interceptedKeys.add(key);
  pendingKeys.delete(key);
  return true;
}

function updateAutoIntercept() {
  const intel = window.__fx.shipIntel;
  if (!intel) return;
  const now = Date.now();
  if (now - lastAutoAt < 300) return;
  lastAutoAt = now;
  const settings = getSettings();

  if (pendingRecalls.size) {
    const control = window.__fx.shipControl;
    for (const index of [...pendingRecalls]) {
      const ship = intel.myShips.find((item) => item.index === index);
      if (!ship || ship.returning || !ship.blockers.length) {
        pendingRecalls.delete(index);
        continue;
      }
      if (control && typeof control.recallShip === "function" && control.recallShip(index)) {
        recalledIndices.add(index);
        pendingRecalls.delete(index);
      }
    }
  }

  if (settings.autoInterceptShips) {
    for (const ship of intel.myShips) {
      for (const attacker of ship.attackers) {
        const key = `${attacker.index}:${attacker.player}`;
        if (!attacker.insufficient) pendingKeys.add(key);
      }
    }
  }

  for (const key of [...pendingKeys]) {
    const attacker = attackerByKey(intel, key);
    if (!attacker) {
      pendingKeys.delete(key);
      continue;
    }
    tryIntercept(attacker, intel);
  }
}

export function initShipAuto() {
  if (window.__fx.shipAuto) return window.__fx.shipAuto;
  const api = {
    update: updateAutoIntercept,
    shield(attacker) {
      if (!attacker) return;
      const key = `${attacker.index}:${attacker.player}`;
      pendingKeys.add(key);
      updateAutoIntercept();
    },
  };
  window.__fx.shipAuto = api;
  setInterval(updateAutoIntercept, 500);
  return api;
}

export { updateShipIntel };
