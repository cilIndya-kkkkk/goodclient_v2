const BUTTON_FLAG = "data-fx-unicode-chat";
const SCAN_INTERVAL_MS = 500;

function toFullwidth(text) {
  let result = "";
  for (const character of String(text || "")) {
    const code = character.codePointAt(0);
    if (code >= 0x21 && code <= 0x7e) {
      result += String.fromCharCode(0xff01 + (code - 0x21));
    } else {
      result += character;
    }
  }
  return result;
}

function isChatInput(element) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
  if (element.disabled || element.readOnly) return false;
  const placeholder = String(element.placeholder || "");
  if (/message/i.test(placeholder)) return true;
  const parent = element.parentElement;
  if (!parent) return false;
  const buttons = Array.from(parent.querySelectorAll("button"));
  return buttons.some((button) => /^(send|发送|送信)$/i.test(String(button.textContent || "").trim()));
}

function findSendButton(input, ownButton) {
  const parent = input.parentElement;
  if (!parent) return null;
  const buttons = Array.from(parent.querySelectorAll("button")).filter((button) => button !== ownButton);
  const named = buttons.find((button) => /^(send|发送|送信)$/i.test(String(button.textContent || "").trim()));
  if (named) return named;
  return buttons.length ? buttons[buttons.length - 1] : null;
}

function positionButton(button, input, send) {
  const parent = input.parentElement;
  if (!parent) return;
  button.style.position = "absolute";
  button.style.top = "0";
  button.style.height = "100%";
  button.style.zIndex = "6";
  button.style.boxSizing = "border-box";
  button.style.padding = "0 6px";
  button.style.margin = "0";
  button.style.cursor = "pointer";
  button.style.whiteSpace = "nowrap";

  if (send) {
    const parentRect = parent.getBoundingClientRect();
    const sendRect = send.getBoundingClientRect();
    const right = Math.max(0, parentRect.right - sendRect.left + 4);
    button.style.right = `${Math.round(right)}px`;
    button.style.left = "auto";
    const style = getComputedStyle(send);
    button.style.backgroundColor = style.backgroundColor;
    button.style.color = style.color;
    button.style.border = style.border;
    button.style.borderRadius = style.borderRadius;
    button.style.font = style.font;
    button.style.fontSize = style.fontSize;
    button.style.fontWeight = style.fontWeight;
  } else {
    button.style.right = "4px";
    button.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    button.style.color = "#fff";
    button.style.border = "1px solid rgba(255, 255, 255, 0.6)";
    button.style.borderRadius = "4px";
  }
  button.textContent = parent.getBoundingClientRect().width > 240 ? "Unicode" : "U";
}

function convertInput(input) {
  const converted = toFullwidth(input.value);
  if (converted === input.value) return;
  input.value = converted;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const end = input.value.length;
  try {
    input.setSelectionRange(end, end);
  } catch (_error) {}
  input.focus();
}

function ensureButton(input) {
  const parent = input.parentElement;
  if (!parent) return;
  let button = parent.querySelector(`button[${BUTTON_FLAG}]`);
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.setAttribute(BUTTON_FLAG, "1");
    button.title = "Convert English characters to Unicode";
    button.textContent = "Unicode";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      convertInput(input);
    });
    parent.appendChild(button);
  }
  const send = findSendButton(input, button);
  positionButton(button, input, send);
}

function scan() {
  const inputs = Array.from(document.querySelectorAll("input, textarea"));
  for (const input of inputs) {
    if (isChatInput(input)) ensureButton(input);
  }
}

export default function initChatUnicode() {
  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      scan();
    }, 100);
  }
  scan();
  setInterval(scan, SCAN_INTERVAL_MS);
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", scan);
  return { scan, convert: toFullwidth };
}
