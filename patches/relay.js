import { definePatch } from "../modUtils.js";

// Route the game WebSocket connections through a local/remote relay.
// The relay opens the real upstream socket through a per-bot proxy, so the
// game server sees the proxy's IP instead of the device IP.
export default definePatch(({ waitForMinification, replaceRawCode }) => {
  waitForMinification(() => {
    replaceRawCode(
      `(lT=new WebSocket(lW)).binaryType="arraybuffer",`,
      `if (__fx.relayBase && lW.indexOf("fx-lobbies") < 0) lW = __fx.relayBase + (__fx.relayBase.indexOf("?") < 0 ? "?" : "&") + "target=" + encodeURIComponent(lW);
      (lT=new WebSocket(lW)).binaryType="arraybuffer",`
    );

    replaceRawCode(
      `(lT=new WebSocket("wss://territorial.io/s52/")).onopen=aGE,`,
      `(lT=new WebSocket(__fx.relayBase ? __fx.relayBase + (__fx.relayBase.indexOf("?") < 0 ? "?" : "&") + "target=" + encodeURIComponent("wss://territorial.io/s52/") : "wss://territorial.io/s52/")).onopen=aGE,`
    );
  });
});
