import { definePatch, insert } from "../modUtils.js";

export default definePatch(({ modifyCode }) => {
  modifyCode(`jt = new dK(dL, dM, k3, dO, k6, hq.k7.k8);
${insert(`window.__fx.lobbyTeamsHost = {
  getState: function () {
    if (!hq || !hq.fH || !hq.fH.i1) return null;
    var roomIndex = hq.fH.kD[0];
    var room = hq.fH.i1[roomIndex];
    if (!room) return null;
    var all = hq.hr.hp[roomIndex] || [];
    var ready = hq.hr.km[roomIndex] || 0;
    var players = [];
    for (var i = 0; i < ready && i < all.length; i++) {
      var player = all[i];
      players.push({ id: player.hT, name: player.aXi || player.username, color: player.color });
    }
    return { mode: room.kc, ready: ready, players: players };
  }
};
(function () {
  var button = dM.kA[0].button;
  var row = dM.dp;
  var attempts = 0;
  button.classList.add("fx-lobby-teams-toggle");
  function register() {
    if (window.__fx && window.__fx.lobbyTeams && window.__fx.lobbyTeams.registerToggleButton) {
      window.__fx.lobbyTeams.registerToggleButton(button, row);
      return;
    }
    if (++attempts < 100) setTimeout(register, 100);
  }
  register();
})();`)}`)
});
