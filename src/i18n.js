export function isZh() {
  return false;
}

export function t(text) {
  return text;
}

export function initI18n() {
  window.__fx = window.__fx || {};
  window.__fx.t = t;
  window.__fx.isZh = isZh;
}
