import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(this\.xy=function\(\)\{var oI=io;)/g,
      `$1
      var __fxShipY9 = i.j,
          __fxShipYA = i.k,
          __fxShipE3 = jE / oI,
          __fxShipE6 = jF / oI,
          __fxShipE8 = (__fxShipY9 + jE) / oI,
          __fxShipE9 = (__fxShipYA + jF) / oI,
          __fxShipS9 = -20 * oI,
          __fxShipAId = .5 * __fxShipS9,
          __fxShipYB = bV.fk << 4;
      var __fxShipTargets = new Array(bQ.z.ml);
      for (var __fxShipIndex = 0; __fxShipIndex < bQ.z.ml; __fxShipIndex++) {
        var __fxShipRoute = bQ.z.mm[__fxShipIndex];
        var __fxShipLast = __fxShipRoute && __fxShipRoute.length ? __fxShipRoute[__fxShipRoute.length - 1] : -1;
        var __fxShipTile = __fxShipLast >= 0 && typeof bP !== "undefined" && typeof bP.fQ === "function"
          ? bP.fQ(__fxShipLast)
          : __fxShipLast << 2;
        __fxShipTargets[__fxShipIndex] = __fxShipLast >= 0
          && typeof ad !== "undefined"
          && typeof ad.hA === "function"
          && typeof ad.fS === "function"
          && ad.hA(__fxShipTile)
          ? ad.fS(__fxShipTile)
          : -1;
      }
      if (__fx.drawShipRoutes) {
        try {
          __fx.drawShipRoutes({
            ctx: ws,
            jO: bQ.z.ml,
            iz: bQ.z.n0,
            j6: bQ.z.mp,
            zg: bQ.z.a9v,
            routes: bQ.z.mm,
            routeIndex: bQ.z.mz,
            segmentProgress: bQ.z.abP,
            shipStatus: bQ.z.mm,
            targets: __fxShipTargets,
            mapWidth: bV.fk,
            mapHeight: bV.fl,
            scale: oI,
            camX: jE,
            camY: jF,
            screenWidth: __fxShipY9,
            screenHeight: __fxShipYA,
            project: function(value) {
              var sx = (value % __fxShipYB) / 16;
              var sy = Math.floor(value / __fxShipYB) / 16;
              return {
                x: __fxShipY9 * (sx - __fxShipE3) / (__fxShipE8 - __fxShipE3) + __fxShipAId,
                y: __fxShipYA * (sy - __fxShipE6) / (__fxShipE9 - __fxShipE6) + __fxShipAId
              };
            },
            zt: function(value) {
              return bP.jK(value);
            },
            colors: bj.aE7,
            colorIds: bj.aE8
          });
        } catch (__fxShipError) {
          if (!window.__fxShipError) {
            window.__fxShipError = __fxShipError;
            console.error("[shipRoutes] draw error", __fxShipError);
          }
        }
      }
      __fx.shipControl = __fx.shipControl || {
        recallShip: function(index) {
          try { return bQ.mu.abN(Number(index)); } catch (_error) { return false; }
        },
        interceptShip: function(index, percent) {
          try {
            var state = window.__fx.shipState;
            if (!state || typeof state.project !== "function") return false;
            var point = state.project(state.iz[Number(index)]);
            if (!point || !isFinite(point.x) || !isFinite(point.y)) return false;
            var scale = (typeof i !== "undefined" && i.l) || 1;
            var value = Number(percent);
            if (!isFinite(value)) value = 0.1;
            value = Math.max(0, Math.min(1, value));
            var keybinds = __fx.keybindFunctions;
            var previous = keybinds && typeof keybinds.getAttackPercentage === "function" ? keybinds.getAttackPercentage() : null;
            if (keybinds && typeof keybinds.setAbsolute === "function") keybinds.setAbsolute(value);
            if (keybinds && typeof keybinds.repaintAttackPercentageBar === "function") keybinds.repaintAttackPercentageBar();
            bW.hh(Math.floor(point.x * scale), Math.floor(point.y * scale));
            bW.hi(2);
            if (previous !== null && keybinds && typeof keybinds.setAbsolute === "function") {
              keybinds.setAbsolute(previous);
              if (typeof keybinds.repaintAttackPercentageBar === "function") keybinds.repaintAttackPercentageBar();
            }
            return true;
          } catch (_error) { return false; }
        }
      };`
    );
  });
});
