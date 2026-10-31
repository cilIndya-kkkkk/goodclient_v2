import { t } from "./i18n.js";

const DB_NAME = "fx_account_vault";
const STORE_NAME = "vault";
const KEY_ID = "deviceKey";
const DATA_ID = "data";
const FORMAT = "goodclient-account-vault";
const FORMAT_VERSION = 1;
const KDF_ITERATIONS = 310000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let panel = null;
let body = null;
let listEl = null;
let statusEl = null;
let codeEl = null;
let editorEl = null;
let nameInput = null;
let accountInput = null;
let passwordInput = null;
let noteInput = null;
let fileInput = null;
let entries = [];
let vaultKey = null;
let dataIv = null;
let dataCipher = null;
let activeId = null;
let initialized = false;
let initPromise = null;

function b64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function unb64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function normalizeRecoveryCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z2-9]/g, "");
}

function generateRecoveryCode() {
  const bytes = randomBytes(24);
  let raw = "";
  for (const byte of bytes) raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return raw.match(/.{1,4}/g).join("-");
}

async function deriveWrapKey(code, salt) {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(normalizeRecoveryCode(code)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function saveVault() {
  dataIv = randomBytes(12);
  const payload = encoder.encode(JSON.stringify(entries));
  dataCipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: dataIv }, vaultKey, payload);
  await idbSet(DATA_ID, {
    iv: dataIv.buffer,
    ciphertext: dataCipher,
  });
}

async function initVault() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!crypto || !crypto.subtle) throw new Error("WebCrypto is not available (use HTTPS or localhost).");
    const storedKey = await idbGet(KEY_ID);
    if (storedKey && storedKey.type === "secret") {
      vaultKey = storedKey;
    } else {
      vaultKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      await idbSet(KEY_ID, vaultKey);
    }
    const storedData = await idbGet(DATA_ID);
    if (storedData && storedData.iv && storedData.ciphertext) {
      dataIv = new Uint8Array(storedData.iv);
      dataCipher = storedData.ciphertext;
      try {
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: dataIv }, vaultKey, dataCipher);
        const parsed = JSON.parse(decoder.decode(plain));
        entries = Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        entries = [];
      }
    }
    initialized = true;
  })();
  return initPromise;
}

function setStatus(message, bad = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("bad", bad);
}

async function copyText(value, label) {
  const text = String(value || "");
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`${label} copied`);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      setStatus(`${label} copied`);
    } catch (copyError) {
      setStatus(`Could not copy ${label.toLowerCase()}`, true);
    }
    textarea.remove();
  }
}

function downloadFile(name, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fx-vault-button ${className}`.trim();
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function makeRow(...children) {
  const row = document.createElement("div");
  row.className = "fx-vault-row";
  row.append(...children);
  return row;
}

function closeEditor() {
  activeId = null;
  if (editorEl) editorEl.classList.add("hidden");
}

function closeVault() {
  if (!panel) return;
  panel.classList.remove("open");
  closeEditor();
  initialized = false;
  initPromise = null;
  entries = [];
  vaultKey = null;
  dataIv = null;
  dataCipher = null;
  if (codeEl) {
    if (codeEl._value) codeEl._value.textContent = "";
    codeEl.classList.add("hidden");
  }
}

function openEditor(entry) {
  activeId = entry ? entry.id : null;
  nameInput.value = entry ? entry.name || "" : "";
  accountInput.value = entry ? entry.account || "" : "";
  passwordInput.value = entry ? entry.password || "" : "";
  noteInput.value = entry ? entry.note || "" : "";
  editorEl.classList.remove("hidden");
  editorEl.scrollIntoView({ block: "nearest" });
  nameInput.focus();
}

async function commitEditor() {
  const name = nameInput.value.trim();
  const account = accountInput.value.trim();
  const password = passwordInput.value;
  const note = noteInput.value.trim();
  if (!name && !account) {
    setStatus("Enter a name or account", true);
    return;
  }
  const entry = {
    id: activeId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    name: name || account,
    account,
    password,
    note,
    updatedAt: Date.now(),
  };
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  await saveVault();
  closeEditor();
  renderList();
  setStatus("Saved");
}

function renderList() {
  if (!listEl) return;
  listEl.textContent = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "fx-vault-empty";
    empty.textContent = "No saved accounts yet.";
    listEl.appendChild(empty);
    return;
  }
  const sorted = entries.slice().sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  for (const entry of sorted) {
    const main = document.createElement("div");
    main.className = "fx-vault-row-main";
    const name = document.createElement("div");
    name.className = "fx-vault-name";
    name.textContent = entry.name || entry.account || "(unnamed)";
    const account = document.createElement("div");
    account.className = "fx-vault-account";
    account.textContent = entry.account || "";
    main.append(name, account);
    if (entry.note) {
      const note = document.createElement("div");
      note.className = "fx-vault-note";
      note.textContent = entry.note;
      main.appendChild(note);
    }
    const actions = document.createElement("div");
    actions.className = "fx-vault-actions";
    actions.append(
      makeButton("Copy user", () => copyText(entry.account, "Account"), "fx-vault-small"),
      makeButton("Copy pass", () => copyText(entry.password, "Password"), "fx-vault-small"),
      makeButton("Edit", () => openEditor(entry), "fx-vault-small"),
      makeButton("Delete", async () => {
        if (!confirm(`Delete ${entry.name || entry.account}?`)) return;
        entries = entries.filter((item) => item.id !== entry.id);
        await saveVault();
        renderList();
        setStatus("Deleted");
      }, "fx-vault-small fx-vault-danger")
    );
    listEl.appendChild(makeRow(main, actions));
  }
}

async function exportVault() {
  const rawKey = await crypto.subtle.exportKey("raw", vaultKey);
  const recoveryCode = generateRecoveryCode();
  const salt = randomBytes(16);
  const wrapIv = randomBytes(12);
  const wrapKey = await deriveWrapKey(recoveryCode, salt);
  const wrappedKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv: wrapIv }, wrapKey, rawKey);

  if (!dataCipher) await saveVault();
  const file = {
    format: FORMAT,
    version: FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    salt: b64(salt),
    wrapIv: b64(wrapIv),
    wrappedKey: b64(wrappedKey),
    dataIv: b64(dataIv),
    data: b64(dataCipher),
    entries: entries.length,
  };
  downloadFile(`goodclient-vault-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(file, null, 2));
  codeEl._value.textContent = recoveryCode;
  codeEl.classList.remove("hidden");
  setStatus("Encrypted backup downloaded. Save the recovery code shown below.");
}

async function importVault(file) {
  let parsed = null;
  try {
    parsed = JSON.parse(await file.text());
  } catch (_error) {
    setStatus("Backup file is not valid JSON", true);
    return;
  }
  if (parsed.format !== FORMAT || !parsed.wrappedKey || !parsed.data) {
    setStatus("This is not a GoodClient account vault backup", true);
    return;
  }
  const code = prompt("Enter the recovery code for this backup:");
  if (!code) return;
  try {
    const wrapKey = await deriveWrapKey(code, unb64(parsed.salt));
    const rawKey = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(parsed.wrapIv) },
      wrapKey,
      unb64(parsed.wrappedKey)
    );
    const importedKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(parsed.dataIv) },
      importedKey,
      unb64(parsed.data)
    );
    const importedEntries = JSON.parse(decoder.decode(plain));
    if (!Array.isArray(importedEntries)) throw new Error("Invalid vault payload");
    if (!confirm("Replace the current vault with this backup?")) return;
    entries = importedEntries;
    vaultKey = importedKey;
    await idbSet(KEY_ID, vaultKey);
    await saveVault();
    renderList();
    codeEl.classList.add("hidden");
    setStatus("Encrypted backup imported");
  } catch (_error) {
    setStatus("Wrong recovery code or damaged backup file", true);
  }
}

function createPanel() {
  panel = document.createElement("div");
  panel.id = "fxAccountVault";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Account Vault");

  const header = document.createElement("div");
  header.id = "fxAccountVaultHeader";
  const title = document.createElement("span");
  title.textContent = t("Account Vault");
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "fx-vault-close";
  closeButton.textContent = t("Close");
  closeButton.addEventListener("click", closeVault);
  header.append(title, closeButton);

  body = document.createElement("div");
  body.id = "fxAccountVaultBody";

  const note = document.createElement("p");
  note.className = "fx-vault-note";
  note.textContent = "Local-only account vault. Entries are encrypted at rest with a device key. Export creates an encrypted backup that needs the one-time recovery code. Any script running on this page can read entries while the vault is open.";

  const toolbar = document.createElement("div");
  toolbar.className = "fx-vault-toolbar";
  fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.className = "hidden";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (file) await importVault(file);
  });
  toolbar.append(
    makeButton("Add account", () => openEditor(null), "fx-vault-primary"),
    makeButton("Export encrypted backup", () => exportVault().catch((error) => setStatus(error && error.message || "Export failed", true))),
    makeButton("Import backup", () => fileInput.click()),
    fileInput
  );

  statusEl = document.createElement("div");
  statusEl.className = "fx-vault-status";

  codeEl = document.createElement("div");
  codeEl.className = "fx-vault-code hidden";
  const codeLabel = document.createElement("span");
  codeLabel.textContent = "Recovery code (save it now): ";
  const codeValue = document.createElement("strong");
  codeValue.id = "fxVaultRecoveryCode";
  const codeCopy = makeButton("Copy code", () => copyText(codeValue.textContent, "Recovery code"), "fx-vault-small");
  codeEl.append(codeLabel, codeValue, codeCopy);
  codeEl._value = codeValue;

  listEl = document.createElement("div");
  listEl.className = "fx-vault-list";

  editorEl = document.createElement("div");
  editorEl.className = "fx-vault-editor hidden";
  nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Label (e.g. Main account)";
  nameInput.className = "fx-vault-input";
  accountInput = document.createElement("input");
  accountInput.type = "text";
  accountInput.placeholder = "Account name";
  accountInput.className = "fx-vault-input";
  passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.placeholder = "Password";
  passwordInput.className = "fx-vault-input";
  noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.placeholder = "Note (optional)";
  noteInput.className = "fx-vault-input";
  const editorActions = document.createElement("div");
  editorActions.className = "fx-vault-toolbar";
  editorActions.append(
    makeButton("Save", () => commitEditor().catch((error) => setStatus(error && error.message || "Could not save", true)), "fx-vault-primary"),
    makeButton("Cancel", () => closeEditor())
  );
  editorEl.append(nameInput, accountInput, passwordInput, noteInput, editorActions);

  body.append(note, toolbar, statusEl, codeEl, listEl, editorEl);
  panel.append(header, body);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("open")) closeVault();
  });
  (document.getElementById("windowContainer") || document.body).appendChild(panel);
}

async function openAccountVault() {
  if (!panel) createPanel();
  if (!document.body.contains(panel)) {
    (document.getElementById("windowContainer") || document.body).appendChild(panel);
  }
  panel.classList.add("open");
  if (!initialized) {
    setStatus("Unlocking local vault…");
    try {
      await initVault();
      setStatus("");
      renderList();
    } catch (error) {
      initPromise = null;
      setStatus(error && error.message ? error.message : "Could not open the vault", true);
      return;
    }
  } else {
    renderList();
  }
}

export { openAccountVault };
