import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(this\.yI=function\(\)\{var oL=ir;)/g,
      `$1
      var __fxShipY9 = i.j,
          __fxShipYA = i.k,
          __fxShipE3 = jH / oL,
          __fxShipE6 = jI / oL,
          __fxShipE8 = (__fxShipY9 + jH) / oL,
          __fxShipE9 = (__fxShipYA + jI) / oL,
          __fxShipS9 = -20 * oL,
          __fxShipAId = .5 * __fxShipS9,
          __fxShipYB = bV.fn << 4;
      var __fxShipTargets = new Array(bQ.z.mo);
      for (var __fxShipIndex = 0; __fxShipIndex < bQ.z.mo; __fxShipIndex++) {
        var __fxShipRoute = bQ.z.mq[__fxShipIndex];
        var __fxShipLast = __fxShipRoute && __fxShipRoute.length ? __fxShipRoute[__fxShipRoute.length - 1] : -1;
        var __fxShipTile = __fxShipLast >= 0 && typeof bP !== "undefined" && typeof bP.fS === "function"
          ? bP.fS(__fxShipLast)
          : __fxShipLast << 2;
        __fxShipTargets[__fxShipIndex] = __fxShipLast >= 0
          && typeof ad !== "undefined"
          && typeof ad.hC === "function"
          && typeof ad.fU === "function"
          && ad.hC(__fxShipTile)
          ? ad.fU(__fxShipTile)
          : -1;
      }
      if (__fx.drawShipRoutes) {
        try {
          __fx.drawShipRoutes({
            ctx: yJ,
            jO: bQ.z.mo,
            iz: bQ.z.n3,
            j6: bQ.z.ms,
            zg: bQ.z.aAQ,
            routes: bQ.z.mq,
            routeIndex: bQ.z.n2,
            segmentProgress: bQ.z.acf,
            shipStatus: bQ.z.mp,
            targets: __fxShipTargets,
            mapWidth: bV.fn,
            mapHeight: bV.fo,
            scale: oL,
            camX: jH,
            camY: jI,
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
              return bP.jN(value);
            },
            colors: bj.aEc,
            colorIds: bj.aEd
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
          try { return bQ.mx.acd(Number(index)); } catch (_error) { return false; }
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
            bW.hj(Math.floor(point.x * scale), Math.floor(point.y * scale));
            bW.hk(2);
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
