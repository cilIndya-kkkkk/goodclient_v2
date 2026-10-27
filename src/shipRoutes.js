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

export default function initShipRoutes() {
  function drawShipRoutes(state) {
    const ctx = state.ctx;
    if (!ctx || !Number.isFinite(state.jO) || state.jO <= 0) return;
    const mapWidth = Number(state.mapWidth) || 0;
    if (!mapWidth) return;
    const stride = mapWidth * 16;
    const routes = state.routes || [];
    const routeIndex = state.routeIndex || [];
    const scale = Number(state.scale) || 0;
    if (!scale) return;
    const camX = Number(state.camX) || 0;
    const camY = Number(state.camY) || 0;
    const width = Number(state.screenWidth) || 0;
    const height = Number(state.screenHeight) || 0;
    const zt = typeof state.zt === "function" ? state.zt : (value) => value;

    let drawnRoutes = 0;
    let drawnPoints = 0;
    let foundPaths = 0;
    if (state.jO > 0 && !window.__fx.shipRouteDebug) {
      const sample = routes?.[0];
      window.__fx.shipRouteDebug = {
        routesType: Array.isArray(routes),
        firstType: sample ? sample.constructor?.name : null,
        firstLength: sample ? sample.length : null,
        firstPoint: sample ? sample[0] : null,
        iz: state.iz?.[0],
        j6: state.j6?.[0],
        zt: typeof state.zt,
        scale: state.scale,
        camX: state.camX,
        camY: state.camY
      };
      console.log("[shipRoutes] sample", window.__fx.shipRouteDebug);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let index = 0; index < state.jO; index++) {
      const route = routes[index];
      if (!route || typeof route.length !== "number" || route.length < 2) continue;
      foundPaths++;
      const start = Math.max(0, Number(routeIndex[index]) || 0);
      const color = colorForShip(state, index);

      ctx.beginPath();
      let drawing = false;
      let routePoints = 0;
      let lastVisibleX = null;
      let lastVisibleY = null;
      for (let pointIndex = start; pointIndex < route.length; pointIndex++) {
        const scaled = zt(route[pointIndex]);
        if (!Number.isFinite(scaled)) continue;
        const worldX = (scaled % stride) / 16;
        const worldY = Math.floor(scaled / stride) / 16;
        const screenX = scale * worldX - camX;
        const screenY = scale * worldY - camY;
        if (screenX < -80 || screenY < -80 || screenX > width + 80 || screenY > height + 80) {
          drawing = false;
          continue;
        }
        if (!drawing) {
          ctx.moveTo(screenX, screenY);
          drawing = true;
        } else {
          ctx.lineTo(screenX, screenY);
        }
        routePoints++;
        lastVisibleX = screenX;
        lastVisibleY = screenY;
      }
      if (routePoints > 1) {
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
        const worldX = (current % stride) / 16;
        const worldY = Math.floor(current / stride) / 16;
        const screenX = scale * worldX - camX;
        const screenY = scale * worldY - camY;
        if (screenX > -20 && screenY > -20 && screenX < width + 20 && screenY < height + 20) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
          ctx.fill();
          labelX = screenX;
          labelY = screenY;
        }
      }
      if (labelX === null && lastVisibleX !== null) {
        labelX = lastVisibleX;
        labelY = lastVisibleY;
      }
      const troops = Number(state.zg?.[index]) || 0;
      if (labelX !== null && troops > 0) {
        const text = formatTroops(troops);
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

    ctx.restore();
    window.__fx.shipRouteStatus = { ships: state.jO, paths: foundPaths, routes: drawnRoutes, points: drawnPoints };
  }

  window.__fx = window.__fx || {};
  window.__fx.drawShipRoutes = drawShipRoutes;
  return { drawShipRoutes };
}
