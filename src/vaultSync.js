import { getVaultEntries, mergeVaultEntries, upsertVaultAccount } from "./accountVault.js";

const DEFAULT_ENDPOINT = "https://goodclient-vault.cilindya.workers.dev/vault";
const ENDPOINT_KEY = "fx_vault_sync_endpoint";
const HASH_KEY = "fx_vault_sync_hash";
const FIXED_SECRET = "asdfGG12345";
const encoder = new TextEncoder();

let keyPromise = null;
let running = false;
let lastAccount = "";
let lastPassword = "";

function randomHex(bytes) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

function getEndpoint() {
  const saved = String(localStorage.getItem(ENDPOINT_KEY) || "").trim();
  return (saved || DEFAULT_ENDPOINT).replace(/\/+$/, "");
}

function setEndpoint(url) {
  const value = String(url || "").trim();
  if (value) localStorage.setItem(ENDPOINT_KEY, value.replace(/\/+$/, ""));
  else localStorage.removeItem(ENDPOINT_KEY);
  return getEndpoint();
}

function getHash() {
  let hash = String(localStorage.getItem(HASH_KEY) || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    hash = randomHex(32);
    localStorage.setItem(HASH_KEY, hash);
  }
  return hash;
}

function getKey() {
  if (!keyPromise) {
    keyPromise = crypto.subtle
      .digest("SHA-256", encoder.encode(FIXED_SECRET))
      .then((raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]));
  }
  return keyPromise;
}

async function encryptEntries(entries) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = encoder.encode(JSON.stringify(entries));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const output = new Uint8Array(12 + cipher.byteLength);
  output.set(iv, 0);
  output.set(new Uint8Array(cipher), 12);
  return output;
}

async function decryptEntries(blob) {
  if (!blob || blob.byteLength < 13) throw new Error("Empty vault blob");
  const key = await getKey();
  const iv = blob.slice(0, 12);
  const cipher = blob.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  const parsed = JSON.parse(new TextDecoder().decode(plain));
  if (!Array.isArray(parsed)) throw new Error("Invalid vault payload");
  return parsed;
}

async function uploadEntries(entries) {
  const hash = getHash();
  const body = await encryptEntries(entries);
  const response = await fetch(`${getEndpoint()}/${hash}.bin`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Vault upload failed (${response.status})`);
  return { hash, bytes: body.byteLength, count: entries.length };
}

async function downloadEntries() {
  const hash = getHash();
  const response = await fetch(`${getEndpoint()}/${hash}.bin`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Vault download failed (${response.status})`);
  return decryptEntries(await response.arrayBuffer());
}

async function syncNow() {
  const entries = await getVaultEntries();
  if (!entries.length) return { uploaded: false, count: 0 };
  return uploadEntries(entries);
}

async function pullAndMerge() {
  const remote = await downloadEntries();
  if (remote) {
    await mergeVaultEntries(remote);
    await uploadEntries(await getVaultEntries());
    return { pulled: remote.length };
  }
  const local = await getVaultEntries();
  if (local.length) await uploadEntries(local);
  return { pulled: 0 };
}

function gameCredentials() {
  const read = (key) => {
    try {
      return String(localStorage.getItem(key) || "");
    } catch (_error) {
      return "";
    }
  };
  let account = read("v105") || read("d105");
  let password = read("v106") || read("d106");
  if ((!account || !password) && window.bm && window.bm.buffer && Array.isArray(window.bm.buffer.data)) {
    account = account || String(window.bm.buffer.data[105]?.value || "");
    password = password || String(window.bm.buffer.data[106]?.value || "");
  }
  return {
    account: String(account).trim().slice(0, 20),
    password: String(password).slice(0, 64),
  };
}

async function detectLoginAndSync() {
  if (running) return;
  const { account, password } = gameCredentials();
  if (!account || !password) return;
  if (account === lastAccount && password === lastPassword) return;
  running = true;
  try {
    await upsertVaultAccount(account, password);
    lastAccount = account;
    lastPassword = password;
    await syncNow();
  } catch (error) {
    console.warn("[vaultSync] sync failed", error);
  } finally {
    running = false;
  }
}

export default function initVaultSync() {
  const api = {
    getHash,
    getEndpoint,
    setEndpoint,
    syncNow,
    pullAndMerge,
    detectLoginAndSync,
  };
  window.__fx.vaultSync = api;
  pullAndMerge().catch((error) => console.warn("[vaultSync] initial sync failed", error));
  setInterval(detectLoginAndSync, 1000);
  window.addEventListener("storage", detectLoginAndSync);
  setTimeout(detectLoginAndSync, 500);
  return api;
}
