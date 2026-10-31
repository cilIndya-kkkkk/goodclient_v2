import { definePatch, insert } from "../modUtils.js";

export default definePatch(({ modifyCode }) => {
  modifyCode(`jt = new dK(dL, dM, k3, dO, k6, hq.k7.k8);
${insert(`window.__fx.lobbyTeamsHost = {
  getState: function () {
    if (!hq || !hq.b1 || !hq.b1.jH) return null;
    var roomIndex = hq.b1.a30[0];
    var room = hq.b1.jH[roomIndex];
    if (!room) return null;
    var all = hq.aU.aV[roomIndex] || [];
    var ready = hq.aU.jQ[roomIndex] || 0;
    var players = [];
    for (var i = 0; i < ready && i < all.length; i++) {
      var player = all[i];
      players.push({ id: player.ah, name: player.aXn || player.username, color: player.color });
    }
    return { mode: room.jK, ready: ready, players: players };
  }
};
(function () {
  var button = dM.nw[0].button;
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
  function inPanel(target) {
    return target && target.closest && target.closest('[data-window-name="lobbyTeams"]');
  }
  function hit(event) {
    if (inPanel(event.target)) return;
    hitAt(event.clientX, event.clientY);
  }
  function touchHit(event) {
    if (inPanel(event.target)) return;
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
