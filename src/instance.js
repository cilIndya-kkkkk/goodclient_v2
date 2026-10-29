export function isBotInstance() {
  const params = new URLSearchParams(location.search);
  if (params.get("bot") === "1" || params.get("tabbot") === "1") return true;
  return /(^|\/)bot\.html$/.test(location.pathname);
}

export function getHost() {
  try {
    if (window.parent && window.parent !== window) {
      return window.parent.__fxHost || null;
    }
  } catch (_error) {}
  return null;
}

export function isEmbedded() {
  return Boolean(getHost());
}
