import { initI18n } from "../i18n.js";
import initMusicPlayer from "../musicPlayer.js";
import initHostTabMode from "./tabMode.js";

function currentBuildVersion() {
  const script = Array.from(document.scripts).find((item) => /(^|\/)host\.bundle\.js\?\d+/.test(item.src));
  if (script) {
    try {
      const stamp = new URL(script.src, location.href).search.replace(/^\?/, "");
      if (stamp) return stamp;
    } catch (_error) {}
  }
  return String(Date.now());
}

const buildVersion = currentBuildVersion();

function frameUrl(page, extra = {}) {
  const url = new URL(page, location.href);
  url.searchParams.set("v", buildVersion);
  const hostParams = new URLSearchParams(location.search);
  for (const key of ["relay", "lang"]) {
    const value = hostParams.get(key);
    if (value !== null) url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  return url.href;
}

async function forceReload() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (_error) {}
  const url = new URL(location.href);
  url.searchParams.set("v", String(Date.now()));
  location.replace(url.href);
}

function requestFullscreen() {
  if (document.fullscreenElement !== null || !document.fullscreenEnabled) return;
  document.documentElement
    .requestFullscreen({ navigationUI: "hide" })
    .catch((error) => console.warn("Could not enter fullscreen mode:", error));
}

function getTopUrl() {
  return location.href.split("#")[0];
}

initI18n();
let music = null;
try {
  music = initMusicPlayer();
} catch (error) {
  console.error("Music player failed to initialize", error);
}

window.__fxHost = {
  music,
  requestFullscreen,
  forceReload,
  getTopUrl,
  tabMode: null,
};

function attachGestureForwarding(frame) {
  frame.addEventListener("load", () => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const notify = () => music?.notifyUserGesture?.();
      doc.addEventListener("pointerdown", notify, true);
      doc.addEventListener("keydown", notify, true);
      doc.addEventListener("touchstart", notify, true);
    } catch (_error) {}
  });
}

const mainFrame = document.createElement("iframe");
mainFrame.id = "fxMainFrame";
mainFrame.title = "GoodClient";
mainFrame.allow = "autoplay; fullscreen";
attachGestureForwarding(mainFrame);
mainFrame.src = frameUrl("client.html", { host: "1" }) + (location.hash || "");
document.body.appendChild(mainFrame);

const tabMode = initHostTabMode({ mainFrame, frameUrl, attachGestureForwarding });
window.__fxHost.tabMode = tabMode;

window.addEventListener("hashchange", () => {
  try {
    mainFrame.contentWindow.location.hash = location.hash;
  } catch (_error) {}
});

export { mainFrame, frameUrl, buildVersion, attachGestureForwarding };
