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
  var attempts = 0;
  function api() {
    return window.__fx && window.__fx.lobbyTeams;
  }
  function mark() {
    var client = api();
    var ready = Boolean(client && client.toggle);
    button.classList.remove(ready ? "fx-lobby-teams-missing" : "fx-lobby-teams-ready");
    button.classList.add(ready ? "fx-lobby-teams-ready" : "fx-lobby-teams-missing");
    if (ready && client.setAnchor) client.setAnchor(button);
    return ready;
  }
  function hitAt(x, y) {
    if (!button.isConnected) return;
    var rect = button.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (x < rect.left || x > rect.right) return;
    if (y < rect.top || y > rect.bottom) return;
    if (mark()) api().toggle();
  }
  function hit(event) {
    hitAt(event.clientX, event.clientY);
  }
  function touchHit(event) {
    var touch = event.changedTouches && event.changedTouches[0];
    if (touch) hitAt(touch.clientX, touch.clientY);
  }
  document.addEventListener("pointerdown", hit, true);
  document.addEventListener("click", hit, true);
  document.addEventListener("touchend", touchHit, true);
  mark();
  (function poll() {
    if (mark()) return;
    if (++attempts < 100) setTimeout(poll, 100);
  })();
})();`)}`)
});
