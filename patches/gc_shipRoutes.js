import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(rE=ey\.rE,es=aIa,e2=dE;)/g,
      `$1
      if (__fx.drawShipRoutes) {
        try {
          __fx.drawShipRoutes({
            ctx: e2,
            jO: aM,
            iz: kY,
            j6: kw,
            zg: h0.b1.kx,
            routes: h0.b1.pn,
            routeIndex: h0.b1.kv,
            segmentProgress: h0.b1.kZ,
            shipStatus: h0.b1.kX,
            mapWidth: fU.fV,
            mapHeight: fU.iD,
            scale: aIc,
            camX: e4,
            camY: e7,
            screenWidth: y9,
            screenHeight: yA,
            project: function(value) {
              var sx = (value % yB) / 16;
              var sy = Math.floor(value / yB) / 16;
              return {
                x: y9 * (sx - e3) / (e8 - e3) + aId,
                y: yA * (sy - e6) / (e9 - e6) + aId
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
