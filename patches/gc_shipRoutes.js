import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(rE=ey\.rE,es=aIa,e2=dE;)/g,
      `$1
      if (__fx.settings.showShipRoutes && __fx.drawShipRoutes) {
        __fx.drawShipRoutes({
          ctx: e2,
          jO: aM,
          iz: kY,
          j6: kw,
          zg: h0.b1.kx,
          routes: h0.b1.pn,
          routeIndex: h0.b1.kv,
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
          zt: dr.iL,
          player: ct.eG,
          humans: ct.dP,
          colors: ey.rD,
          colorIds: ey.rE,
          format: aR.h.dG
        });
      }`,
    );
  });
});
