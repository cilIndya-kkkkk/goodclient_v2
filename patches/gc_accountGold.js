import { definePatch } from "../modUtils.js";

export default definePatch((modUtils) => {
  modUtils.waitForMinification(() => {
    modUtils.replaceOne(
      /(function aUl\(data\)\{)/g,
      `window.__fx = window.__fx || {};
      window.__fx.accountGold = window.__fx.accountGold || {
        pending: [],
        onProfile: function (data) {
          var item = this.pending.shift();
          if (!item) return;
          clearTimeout(item.timer);
          try {
            item.resolve({
              gold: Math.round(Number(data.a0A) || 0) / 100,
              username: data.username,
              rank: data.aVd
            });
          } catch (_error) {
            item.reject(_error);
          }
          try { u.a4x(); } catch (_error) {}
        },
        request: function (name) {
          var self = this;
          return new Promise(function (resolve, reject) {
            var value = String(name || "").slice(0, 5);
            if (!value) {
              reject(new Error("empty account"));
              return;
            }
            var item = { name: value, resolve: resolve, reject: reject };
            item.timer = setTimeout(function () {
              var index = self.pending.indexOf(item);
              if (index >= 0) self.pending.splice(index, 1);
              reject(new Error("gold lookup timeout"));
            }, 8000);
            self.pending.push(item);
            try {
              u.v(8, u.vX, new vY(1000, { action: 0, pg: value, vW: 0 }));
            } catch (error) {
              clearTimeout(item.timer);
              var index = self.pending.indexOf(item);
              if (index >= 0) self.pending.splice(index, 1);
              reject(error);
            }
          });
        }
      };
      $1
      try { window.__fx.accountGold.onProfile(data); } catch (_error) {}
      `
    );
  });
});
