import { updateShipIntel } from "./shipIntel.js";

function formatTroops(value) {
  const n = Number(value) || 0;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}b`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}m`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

function colorForShip(state, index) {
  const player = Number(state.j6?.[index] ?? 0) >> 3;
  const colorId = state.colorIds?.[player];
  const rgb = state.colors?.[colorId];
  if (Array.isArray(rgb) && rgb.length >= 3) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.62)`;
  }
  return "rgba(255, 215, 80, 0.9)";
}

function shipProgress(state, index) {
  const route = state.routes?.[index];
  const length = route && Number.isFinite(route.length) ? route.length : 0;
  if (length <= 1) return 1;
  const routeIndex = Number(state.routeIndex?.[index]) || 0;
  const segment = Number(state.segmentProgress?.[index]) || 0;
  return Math.min(1, Math.max(0, (routeIndex + Math.min(1, Math.max(0, segment / 65535))) / (length - 1)));
}

function drawX(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x - radius, y - radius);
  ctx.lineTo(x + radius, y + radius);
  ctx.moveTo(x + radius, y - radius);
  ctx.lineTo(x - radius, y + radius);
  ctx.stroke();
}

export default function initShipRoutes() {
  function drawShipRoutes(state) {
    window.__fx = window.__fx || {};
    window.__fx.shipState = state;
    const shipCount = Math.max(0, Math.floor(Number(state.jO) || 0));
    const routes = state.routes || [];
    const routeIndex = state.routeIndex || [];
    const progress = new Array(shipCount);
    for (let index = 0; index < shipCount; index++) {
      progress[index] = shipProgress(state, index);
    }
    state.progress = progress;

    const settings = window.__fx.settings || {};
    const showRoutes = settings.showShipRoutes !== false;
    const showProgress = settings.showShipProgress !== false;

    updateShipIntel(state);

    const ctx = state.ctx;
    if (!ctx || shipCount <= 0) {
      window.__fx.shipRouteStatus = { ships: shipCount, paths: 0, routes: 0, points: 0 };
      return;
    }
    const mapWidth = Number(state.mapWidth) || 0;
    if (!mapWidth) return;
    const stride = mapWidth * 16;
    const scale = Number(state.scale) || 0;
    if (!scale) return;
    const camX = Number(state.camX) || 0;
    const camY = Number(state.camY) || 0;
    const width = Number(state.screenWidth) || 0;
    const height = Number(state.screenHeight) || 0;
    const zt = typeof state.zt === "function" ? state.zt : (value) => value;
    const project = typeof state.project === "function"
      ? state.project
      : (value) => {
          const worldX = (value % stride) / 16;
          const worldY = Math.floor(value / stride) / 16;
          return { x: scale * worldX - camX, y: scale * worldY - camY };
        };

    let drawnRoutes = 0;
    let drawnPoints = 0;
    let foundPaths = 0;
    ctx.save();
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let index = 0; index < shipCount; index++) {
        const route = routes[index];
        if (!route || typeof route.length !== "number" || route.length < 2) continue;
        foundPaths++;
        const start = Math.max(0, Number(routeIndex[index]) || 0);
        const color = colorForShip(state, index);

        let drawing = false;
        let routePoints = 0;
        let lastVisibleX = null;
        let lastVisibleY = null;
        if (showRoutes) ctx.beginPath();
        for (let pointIndex = start; pointIndex < route.length; pointIndex++) {
          const scaled = zt(route[pointIndex]);
          if (!Number.isFinite(scaled)) continue;
          const point = project(scaled);
          const screenX = Number(point && point.x);
          const screenY = Number(point && point.y);
          if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) continue;
          if (screenX < -80 || screenY < -80 || screenX > width + 80 || screenY > height + 80) {
            drawing = false;
            continue;
          }
          if (showRoutes) {
            if (!drawing) {
              ctx.moveTo(screenX, screenY);
              drawing = true;
            } else {
              ctx.lineTo(screenX, screenY);
            }
          }
          routePoints++;
          lastVisibleX = screenX;
          lastVisibleY = screenY;
        }
        if (showRoutes && routePoints > 1) {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
          drawnRoutes++;
          drawnPoints += routePoints;
        }

        let labelX = null;
        let labelY = null;
        const current = state.iz?.[index];
        if (Number.isFinite(current)) {
          const point = project(current);
          const screenX = Number(point && point.x);
          const screenY = Number(point && point.y);
          if (Number.isFinite(screenX) && Number.isFinite(screenY) && screenX > -20 && screenY > -20 && screenX < width + 20 && screenY < height + 20) {
            if (showRoutes) {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
              ctx.fill();
            }
            labelX = screenX;
            labelY = screenY;
          }
        }
        if (labelX === null && lastVisibleX !== null) {
          labelX = lastVisibleX;
          labelY = lastVisibleY;
        }
        const troops = Number(state.zg?.[index]) || 0;
        const labelParts = [];
        if (showRoutes) labelParts.push(formatTroops(troops));
        if (showProgress) labelParts.push(`${Math.round((progress[index] || 0) * 100)}%`);
        const text = labelParts.join(" · ");
        if (labelX !== null && text) {
          ctx.font = "bold 12px Trebuchet MS, Arial, sans-serif";
          const textWidth = ctx.measureText(text).width;
          const badgeX = Math.min(Math.max(2, labelX + 8), Math.max(2, width - textWidth - 12));
          const badgeY = Math.min(Math.max(2, labelY - 18), Math.max(2, height - 18));
          ctx.fillStyle = "rgba(12, 18, 12, 0.78)";
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(badgeX, badgeY, textWidth + 8, 15);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(text, badgeX + 4, badgeY + 2);
        }
      }

      const intel = window.__fx.shipIntel;
      if (intel && Array.isArray(intel.myShips)) {
        ctx.strokeStyle = "#ff3b3b";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (const ship of intel.myShips) {
          if (ship.returning) continue;
          if (!ship.blockers || ship.blockers.length === 0) continue;
          const current = state.iz?.[ship.index];
          if (!Number.isFinite(current)) continue;
          const point = project(current);
          const screenX = Number(point && point.x);
          const screenY = Number(point && point.y);
          if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) continue;
          if (screenX < -20 || screenY < -20 || screenX > width + 20 || screenY > height + 20) continue;
          drawX(ctx, screenX, screenY, 7);
        }
      }
    } finally {
      ctx.restore();
    }
    window.__fx.shipRouteStatus = { ships: shipCount, paths: foundPaths, routes: drawnRoutes, points: drawnPoints };
  }

  window.__fx = window.__fx || {};
  window.__fx.drawShipRoutes = drawShipRoutes;
  return { drawShipRoutes };
}
