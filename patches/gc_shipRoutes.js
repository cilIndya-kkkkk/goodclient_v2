import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(this\.yv=function\(\)\{var oT=iz;)/g,
      `$1
      var __fxShipY9 = i.j,
          __fxShipYA = i.k,
          __fxShipE3 = jP / oT,
          __fxShipE6 = jQ / oT,
          __fxShipE8 = (__fxShipY9 + jP) / oT,
          __fxShipE9 = (__fxShipYA + jQ) / oT,
          __fxShipS9 = -20 * oT,
          __fxShipAId = .5 * __fxShipS9,
          __fxShipYB = bV.fv << 4;
      var __fxShipTargets = new Array(bQ.z.mw);
      for (var __fxShipIndex = 0; __fxShipIndex < bQ.z.mw; __fxShipIndex++) {
        var __fxShipRoute = bQ.z.my[__fxShipIndex];
        var __fxShipLast = __fxShipRoute && __fxShipRoute.length ? __fxShipRoute[__fxShipRoute.length - 1] : -1;
        var __fxShipTile = __fxShipLast >= 0 && typeof bP !== "undefined" && typeof bP.fa === "function"
          ? bP.fa(__fxShipLast)
          : __fxShipLast << 2;
        __fxShipTargets[__fxShipIndex] = __fxShipLast >= 0
          && typeof ad !== "undefined"
          && typeof ad.hK === "function"
          && typeof ad.fc === "function"
          && ad.hK(__fxShipTile)
          ? ad.fc(__fxShipTile)
          : -1;
      }
      if (__fx.drawShipRoutes) {
        try {
          __fx.drawShipRoutes({
            ctx: yw,
            jO: bQ.z.mw,
            iz: bQ.z.nB,
            j6: bQ.z.n0,
            zg: bQ.z.aAZ,
            routes: bQ.z.my,
            routeIndex: bQ.z.nA,
            segmentProgress: bQ.z.af6,
            shipStatus: bQ.z.mx,
            targets: __fxShipTargets,
            mapWidth: bV.fv,
            mapHeight: bV.fw,
            scale: oT,
            camX: jP,
            camY: jQ,
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
              return bP.jV(value);
            },
            colors: bj.aEm,
            colorIds: bj.aEn
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
          try { return bQ.n5.af4(Number(index)); } catch (_error) { return false; }
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
            bW.hr(Math.floor(point.x * scale), Math.floor(point.y * scale));
            bW.hs(2);
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
