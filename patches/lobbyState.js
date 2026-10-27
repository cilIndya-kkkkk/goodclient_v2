import { definePatch } from "../modUtils.js";

// Expose the in-game lobby "Ready" state so companions (TulipBot) can read and set it.
export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceCode(
      `function k5(kL) {
        hq.fH.kD[3] = 1 - hq.fH.kD[3], kC(3, 1, hq.fH.kD[3]), kL && jZ.kM.kN(4), hq.fH.kD[3] && ep.eq.er(158, hq.fH.kD[0])
      }`,
      `function k5(kL) {
        hq.fH.kD[3] = 1 - hq.fH.kD[3], kC(3, 1, hq.fH.kD[3]), kL && jZ.kM.kN(4), hq.fH.kD[3] && ep.eq.er(158, hq.fH.kD[0])
      }
      window.__fx = window.__fx || {};
      window.__fx.getGameLobbyState = function() {
        var lobby = hq && hq.fH;
        return { inLobby: Boolean(lobby), ready: Boolean(lobby && lobby.kD && lobby.kD[3]) };
      };
      window.__fx.setGameLobbyReady = function(ready) {
        var lobby = hq && hq.fH;
        if (!lobby || !lobby.kD) return false;
        if (Boolean(ready) !== Boolean(lobby.kD[3])) {
          try { k5(1); } catch (error) { return false; }
        }
        return Boolean(lobby.kD[3]);
      };`
    );
  });
});
