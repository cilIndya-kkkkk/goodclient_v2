import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /pU=bn;for\(pU\.imageSmoothingEnabled=a1Q<9,/g,
      `pU=bn;
      if (__fx.settings.showShipRoutes && __fx.drawShipRoutes) {
        __fx.drawShipRoutes({
          ctx: pU,
          jO: b7,
          iz: iz,
          j6: j6,
          zg: zg,
          routes: bQ.fH.jG,
          routeIndex: bQ.fH.jI,
          mapWidth: gW.gX,
          mapHeight: gW.gY,
          scale: a1Q,
          camX: fv,
          camY: fw,
          screenWidth: aIQ,
          screenHeight: aIR,
          zt: ix && typeof ix.zt === "function" ? (value) => ix.zt(value) : null,
          player: c.t,
          humans: c.aI,
          colors: cD.bz,
          colorIds: cD.c3,
          format: aa.b1.b3
        });
      }
      for(pU.imageSmoothingEnabled=a1Q<9,`
    );
  });
});
