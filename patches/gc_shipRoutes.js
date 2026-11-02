import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(this\.dd=function\(\)\{var aIc=e5;)/g,
      `$1
      var __fxShipY9 = d9.aO,
          __fxShipYA = d9.dA,
          __fxShipE3 = e4 / aIc,
          __fxShipE6 = e7 / aIc,
          __fxShipE8 = (__fxShipY9 + e4) / aIc,
          __fxShipE9 = (__fxShipYA + e7) / aIc,
          __fxShipS9 = -20 * aIc,
          __fxShipAId = .5 * __fxShipS9,
          __fxShipYB = fU.fV << 4;
      var __fxShipTargets = new Array(h0.b1.ka);
      for (var __fxShipIndex = 0; __fxShipIndex < h0.b1.ka; __fxShipIndex++) {
        var __fxShipRoute = h0.b1.pn[__fxShipIndex];
        var __fxShipLast = __fxShipRoute && __fxShipRoute.length ? __fxShipRoute[__fxShipRoute.length - 1] : -1;
        var __fxShipTile = __fxShipLast >= 0 && typeof dr !== "undefined" && typeof dr.iI === "function"
          ? dr.iI(__fxShipLast)
          : __fxShipLast << 2;
        __fxShipTargets[__fxShipIndex] = __fxShipLast >= 0
          && typeof d5 !== "undefined"
          && typeof d5.l3 === "function"
          && typeof d5.hp === "function"
          && d5.l3(__fxShipTile)
          ? d5.hp(__fxShipTile)
          : -1;
      }
      if (__fx.drawShipRoutes) {
        try {
          __fx.drawShipRoutes({
            ctx: dE,
            jO: h0.b1.ka,
            iz: h0.b1.kY,
            j6: h0.b1.kw,
            zg: h0.b1.kx,
            routes: h0.b1.pn,
            routeIndex: h0.b1.kv,
            segmentProgress: h0.b1.kZ,
            shipStatus: h0.b1.kX,
            targets: __fxShipTargets,
            mapWidth: fU.fV,
            mapHeight: fU.iD,
            scale: aIc,
            camX: e4,
            camY: e7,
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
              return dr.iL(value);
            },
            player: ct.eG,
            humans: ct.dP,
            colors: ey.rD,
            colorIds: ey.rE,
            format: aR.h.dG
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
          try { return h0.kc.pt(Number(index)); } catch (_error) { return false; }
        },
        interceptShip: function(index, percent) {
          try {
            var state = window.__fx.shipState;
            if (!state || typeof state.project !== "function") return false;
            var point = state.project(state.iz[Number(index)]);
            if (!point || !isFinite(point.x) || !isFinite(point.y)) return false;
            var scale = (typeof d9 !== "undefined" && d9.o5) || 1;
            var value = Number(percent);
            if (!isFinite(value)) value = 0.1;
            value = Math.max(0, Math.min(1, value));
            var keybinds = __fx.keybindFunctions;
            var previous = keybinds && typeof keybinds.getAttackPercentage === "function" ? keybinds.getAttackPercentage() : null;
            if (keybinds && typeof keybinds.setAbsolute === "function") keybinds.setAbsolute(value);
            if (keybinds && typeof keybinds.repaintAttackPercentageBar === "function") keybinds.repaintAttackPercentageBar();
            aIC.aID(Math.floor(point.x * scale), Math.floor(point.y * scale));
            aIC.aIJ(2);
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
