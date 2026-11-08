import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(this\.xl=function\(\)\{var oF=im;)/g,
      `$1
      var __fxShipY9 = i.j,
          __fxShipYA = i.k,
          __fxShipE3 = jD / oF,
          __fxShipE6 = jE / oF,
          __fxShipE8 = (__fxShipY9 + jD) / oF,
          __fxShipE9 = (__fxShipYA + jE) / oF,
          __fxShipS9 = -20 * oF,
          __fxShipAId = .5 * __fxShipS9,
          __fxShipYB = bV.fk << 4;
      var __fxShipTargets = new Array(bQ.z.mk);
      for (var __fxShipIndex = 0; __fxShipIndex < bQ.z.mk; __fxShipIndex++) {
        var __fxShipRoute = bQ.z.mm[__fxShipIndex];
        var __fxShipLast = __fxShipRoute && __fxShipRoute.length ? __fxShipRoute[__fxShipRoute.length - 1] : -1;
        var __fxShipTile = __fxShipLast >= 0 && typeof bP !== "undefined" && typeof bP.fP === "function"
          ? bP.fP(__fxShipLast)
          : __fxShipLast << 2;
        __fxShipTargets[__fxShipIndex] = __fxShipLast >= 0
          && typeof ad !== "undefined"
          && typeof ad.h9 === "function"
          && typeof ad.fR === "function"
          && ad.h9(__fxShipTile)
          ? ad.fR(__fxShipTile)
          : -1;
      }
      if (__fx.drawShipRoutes) {
        try {
          __fx.drawShipRoutes({
            ctx: ws,
            jO: bQ.z.mk,
            iz: bQ.z.mz,
            j6: bQ.z.mo,
            zg: bQ.z.a9g,
            routes: bQ.z.mm,
            routeIndex: bQ.z.my,
            segmentProgress: bQ.z.ab0,
            shipStatus: bQ.z.ml,
            targets: __fxShipTargets,
            mapWidth: bV.fk,
            mapHeight: bV.fl,
            scale: oF,
            camX: jD,
            camY: jE,
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
              return bP.jJ(value);
            },
            colors: bj.aDm,
            colorIds: bj.aDn
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
          try { return bQ.mt.aay(Number(index)); } catch (_error) { return false; }
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
            bW.hg(Math.floor(point.x * scale), Math.floor(point.y * scale));
            bW.hh(2);
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
