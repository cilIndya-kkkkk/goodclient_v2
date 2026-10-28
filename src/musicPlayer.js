import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import { t } from "./i18n.js";

const TOGGLE_POSITION_KEY = "fx_music_toggle_position";
const PANEL_POSITION_KEY = "fx_music_panel_position";
const URLS_KEY = "fx_music_urls";
const VOLUME_KEY = "fx_music_volume";
const REPEAT_KEY = "fx_music_repeat";
const SHUFFLE_KEY = "fx_music_shuffle";
const AUTOPLAY_KEY = "fx_music_autoplay";
const DB_NAME = "fx_music";
const STORE_NAME = "tracks";

const DEFAULT_ARTIST = "Various Artists";

const DEFAULT_TRACKS = [
  {
    id: "builtin-psyched-fevereiro",
    title: "Psyched Fevereiro (Uncut Edition)",
    artist: "t+pazolite",
    src: "assets/music/psyched-fevereiro.mp3",
    type: "builtin",
  },
  {
    id: "builtin-t-vs-shark",
    title: "T vs SHARK",
    artist: "t+pazolite",
    src: "assets/music/t-vs-shark.mp3",
    type: "builtin",
  },
];

function formatTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function makeButton(text, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `fx-music-button ${className}`.trim();
  button.textContent = text;
  return button;
}

function makeRow(...children) {
  const row = document.createElement("div");
  row.className = "fx-music-row";
  row.append(...children);
  return row;
}

function loadStoredUrls() {
  try {
    const parsed = JSON.parse(localStorage.getItem(URLS_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((track) => track && track.src && track.title).map((track) => ({ ...track, type: "url" }))
      : [];
  } catch (_error) {
    return [];
  }
}

function saveStoredUrls(urlTracks) {
  const entries = urlTracks
    .filter((track) => track.type === "url")
    .map(({ id, title, artist, src }) => ({ id, title, artist, src }));
  localStorage.setItem(URLS_KEY, JSON.stringify(entries));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readTags(source) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (tags) => {
      if (done) return;
      done = true;
      resolve(tags || {});
    };
    try {
      jsmediatags.read(source, {
        onSuccess: (result) => {
          const tags = (result && result.tags) || {};
          finish({
            title: String(tags.title || "").trim(),
            artist: String(tags.artist || tags.albumartist || "").trim(),
          });
        },
        onError: () => finish({}),
      });
    } catch (_error) {
      finish({});
    }
    setTimeout(() => finish({}), 4000);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadLocalTracksFromDb() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error);
  });
}

async function saveLocalTrackToDb(entry) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(entry);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deleteLocalTrackFromDb(id) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export default function initMusicPlayer() {
  const playlist = [...DEFAULT_TRACKS.map((track) => ({ ...track })), ...loadStoredUrls()];
  let currentIndex = -1;
  const storedRepeat = localStorage.getItem(REPEAT_KEY);
  let repeat = ["off", "all", "one"].includes(storedRepeat) ? storedRepeat : "off";
  let shuffle = localStorage.getItem(SHUFFLE_KEY) === "1";
  let autoplay = localStorage.getItem(AUTOPLAY_KEY) !== "0";
  let autoplayPending = false;
  let draggingToggle = null;
  let suppressToggleClick = false;
  let draggingPanel = null;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "fxMusicToggle";
  toggle.title = t("Music player (drag to move)");
  toggle.setAttribute("aria-label", t("Music player"));
  const icon = document.createElement("span");
  icon.className = "fx-music-icon";
  icon.textContent = "♫";
  toggle.append(icon);

  const panel = document.createElement("div");
  panel.id = "fxMusic";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t("Music player"));

  const header = document.createElement("div");
  header.id = "fxMusicHeader";
  const headerTitle = document.createElement("span");
  headerTitle.textContent = t("Music player");
  const closeButton = makeButton(t("Close"), "fx-music-close");
  header.append(headerTitle, closeButton);

  const body = document.createElement("div");
  body.id = "fxMusicBody";

  const audio = new Audio();
  audio.preload = "metadata";
  const storedVolumeRaw = localStorage.getItem(VOLUME_KEY);
  const storedVolume = storedVolumeRaw === null ? 0.7 : Number(storedVolumeRaw);
  audio.volume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.7;

  const nowPlaying = document.createElement("div");
  nowPlaying.className = "fx-music-now";
  const nowTitle = document.createElement("div");
  nowTitle.className = "fx-music-now-title";
  nowTitle.dataset.noI18n = "1";
  nowTitle.textContent = t("No music playing");
  const nowMeta = document.createElement("div");
  nowMeta.className = "fx-music-now-meta";
  nowMeta.dataset.noI18n = "1";
  nowPlaying.append(nowTitle, nowMeta);

  const seekRow = document.createElement("div");
  seekRow.className = "fx-music-seek-row";
  const currentTimeLabel = document.createElement("span");
  currentTimeLabel.textContent = "0:00";
  const seek = document.createElement("input");
  seek.type = "range";
  seek.min = "0";
  seek.max = "1000";
  seek.value = "0";
  seek.className = "fx-music-seek";
  const durationLabel = document.createElement("span");
  durationLabel.textContent = "0:00";
  seekRow.append(currentTimeLabel, seek, durationLabel);

  const previousButton = makeButton("⏮", "fx-music-control");
  previousButton.title = t("Previous");
  const playButton = makeButton("▶", "fx-music-control fx-music-play");
  playButton.title = t("Play");
  const nextButton = makeButton("⏭", "fx-music-control");
  nextButton.title = t("Next");
  const repeatButton = makeButton("🔁", "fx-music-control fx-music-small");
  repeatButton.title = t("Repeat off");
  const shuffleButton = makeButton("🔀", "fx-music-control fx-music-small");
  shuffleButton.title = t("Shuffle mode");
  const randomButton = makeButton(t("Random"), "fx-music-control fx-music-random");
  randomButton.title = t("Random play");
  const controls = makeRow(previousButton, playButton, nextButton, randomButton, repeatButton, shuffleButton);

  const volumeRow = document.createElement("div");
  volumeRow.className = "fx-music-volume-row";
  const volumeLabel = document.createElement("span");
  volumeLabel.textContent = t("Volume");
  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = "0";
  volume.max = "100";
  volume.step = "1";
  volume.value = String(Math.round(audio.volume * 100));
  volume.className = "fx-music-volume";
  volumeRow.append(volumeLabel, volume);

  const autoplayLabel = document.createElement("label");
  autoplayLabel.className = "fx-music-check";
  const autoplayCheckbox = document.createElement("input");
  autoplayCheckbox.type = "checkbox";
  autoplayCheckbox.checked = autoplay;
  autoplayCheckbox.addEventListener("change", () => {
    autoplay = autoplayCheckbox.checked;
    localStorage.setItem(AUTOPLAY_KEY, autoplay ? "1" : "0");
  });
  autoplayLabel.append(autoplayCheckbox, document.createTextNode(" " + t("Auto-play on start")));

  const urlRow = document.createElement("div");
  urlRow.className = "fx-music-row";
  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "fx-music-url";
  urlInput.placeholder = t("Paste a music URL");
  const addUrlButton = makeButton(t("Add URL"));
  urlRow.append(urlInput, addUrlButton);

  const fileRow = document.createElement("div");
  fileRow.className = "fx-music-row";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  const addFilesButton = makeButton(t("Add files"));
  fileRow.append(addFilesButton, fileInput);

  const list = document.createElement("div");
  list.className = "fx-music-list";

  const status = document.createElement("div");
  status.className = "fx-music-status";

  body.append(nowPlaying, seekRow, controls, volumeRow, autoplayLabel, urlRow, fileRow, list, status);
  panel.append(header, body);
  document.body.append(toggle, panel);

  function setStatus(message) {
    status.textContent = message || "";
  }

  function loadTogglePosition() {
    try {
      const position = JSON.parse(localStorage.getItem(TOGGLE_POSITION_KEY) || "null");
      if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return null;
      return position;
    } catch (_error) {
      return null;
    }
  }

  function clampTogglePosition(left, top) {
    const rect = toggle.getBoundingClientRect();
    const width = rect.width || 44;
    const height = rect.height || 44;
    return {
      left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - width)),
      top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - height)),
    };
  }

  function applyTogglePosition(left, top, persist = true) {
    const position = clampTogglePosition(left, top);
    toggle.style.left = `${position.left}px`;
    toggle.style.top = `${position.top}px`;
    toggle.style.right = "auto";
    toggle.style.bottom = "auto";
    if (persist) localStorage.setItem(TOGGLE_POSITION_KEY, JSON.stringify(position));
  }

  function applyInitialTogglePosition() {
    const saved = loadTogglePosition();
    if (saved) {
      applyTogglePosition(saved.left, saved.top, false);
      return;
    }
    applyTogglePosition(8, 52, false);
  }

  function loadPanelPosition() {
    try {
      const position = JSON.parse(localStorage.getItem(PANEL_POSITION_KEY) || "null");
      if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return null;
      return position;
    } catch (_error) {
      return null;
    }
  }

  function clampPanelPosition(left, top) {
    const rect = panel.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || 420;
    return {
      left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - width)),
      top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - height)),
    };
  }

  function applyPanelPosition(left, top, persist = true) {
    const position = clampPanelPosition(left, top);
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    if (persist) localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(position));
  }

  function applyInitialPanelPosition() {
    const saved = loadPanelPosition();
    if (saved) {
      applyPanelPosition(saved.left, saved.top, false);
      return;
    }
    requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      const width = rect.width || 360;
      const height = rect.height || 420;
      applyPanelPosition(
        Math.round((window.innerWidth - width) / 2),
        Math.round((window.innerHeight - height) / 2),
        false
      );
    });
  }

  function typeLabel(track) {
    if (track.type === "builtin") return t("Built-in");
    if (track.type === "local") return t("Local file");
    return t("URL");
  }

  function updateNowPlaying() {
    const track = playlist[currentIndex];
    if (!track) {
      nowTitle.textContent = t("No music playing");
      nowMeta.textContent = "";
      return;
    }
    nowTitle.textContent = track.title || t("Unknown track");
    nowMeta.textContent = `${track.artist || DEFAULT_ARTIST} · ${typeLabel(track)}`;
  }

  function updatePlayButton() {
    const playing = !audio.paused && currentIndex >= 0;
    toggle.classList.toggle("playing", playing);
    playButton.textContent = playing ? "⏸" : "▶";
    playButton.title = playing ? t("Pause") : t("Play");
  }

  function renderList() {
    list.textContent = "";
    playlist.forEach((track, index) => {
      const row = document.createElement("div");
      row.className = "fx-music-track" + (index === currentIndex ? " active" : "");
      const title = document.createElement("span");
      title.className = "fx-music-track-title";
      title.dataset.noI18n = "1";
      title.textContent = track.title || t("Unknown track");
      const meta = document.createElement("span");
      meta.className = "fx-music-track-meta";
      meta.textContent = `${track.artist || DEFAULT_ARTIST} · ${typeLabel(track)}`;
      row.append(title, meta);
      if (track.type !== "builtin") {
        const removeButton = makeButton("×", "fx-music-remove");
        removeButton.title = t("Remove");
        removeButton.addEventListener("click", (event) => {
          event.stopPropagation();
          removeTrack(index);
        });
        row.append(removeButton);
      }
      row.addEventListener("click", () => playIndex(index));
      list.append(row);
    });
  }

  function updateRepeatButton() {
    repeatButton.classList.toggle("active", repeat !== "off");
    repeatButton.textContent = repeat === "one" ? "🔂" : "🔁";
    repeatButton.title = repeat === "one" ? t("Repeat one") : repeat === "all" ? t("Repeat all") : t("Repeat off");
  }

  function updateShuffleButton() {
    shuffleButton.classList.toggle("active", shuffle);
  }

  function setupAutoplayGesture() {
    const resume = () => {
      document.removeEventListener("pointerdown", resume, true);
      document.removeEventListener("touchstart", resume, true);
      document.removeEventListener("keydown", resume, true);
      document.removeEventListener("click", resume, true);
      if (autoplayPending && autoplay && audio.paused) {
        autoplayPending = false;
        audio.play().catch(() => {});
      }
    };
    document.addEventListener("pointerdown", resume, true);
    document.addEventListener("touchstart", resume, true);
    document.addEventListener("keydown", resume, true);
    document.addEventListener("click", resume, true);
  }

  function handlePlayFailure(error, quiet = false) {
    const name = error && error.name;
    const message = (error && error.message) || "";
    if (name === "AbortError" || /interrupted/i.test(message)) {
      updatePlayButton();
      return;
    }
    if (name === "NotAllowedError" || /user didn't interact|not allowed/i.test(message)) {
      autoplayPending = true;
      setStatus(t("Click anywhere to start music"));
      setupAutoplayGesture();
      updatePlayButton();
      return;
    }
    if (!quiet) setStatus(`${t("Playback error")}: ${message}`);
    updatePlayButton();
  }

  function playIndex(index, shouldPlay = true, quiet = false) {
    const track = playlist[index];
    if (!track) return;
    currentIndex = index;
    audio.src = new URL(track.src, location.href).href;
    audio.load();
    updateNowPlaying();
    renderList();
    if (shouldPlay) {
      audio.play().then(() => {
        autoplayPending = false;
      }).catch((error) => handlePlayFailure(error, quiet));
    }
  }

  function randomIndex() {
    if (playlist.length <= 1) return Math.max(0, currentIndex);
    let index = currentIndex;
    while (index === currentIndex) index = Math.floor(Math.random() * playlist.length);
    return index;
  }

  function nextIndex() {
    if (!playlist.length) return -1;
    if (shuffle) return randomIndex();
    return (currentIndex + 1) % playlist.length;
  }

  function togglePlay() {
    if (currentIndex < 0) {
      if (playlist.length) playIndex(0);
      return;
    }
    if (audio.paused) {
      audio.play().catch((error) => handlePlayFailure(error));
    } else {
      audio.pause();
    }
  }

  function nextTrack() {
    if (!playlist.length) return;
    playIndex(nextIndex());
  }

  function previousTrack() {
    if (!playlist.length) return;
    if (currentIndex < 0) {
      playIndex(playlist.length - 1);
      return;
    }
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const index = shuffle ? randomIndex() : (currentIndex - 1 + playlist.length) % playlist.length;
    playIndex(index);
  }

  function handleEnded() {
    if (!playlist.length) return;
    if (repeat === "one") {
      audio.currentTime = 0;
      audio.play().catch((error) => handlePlayFailure(error));
      return;
    }
    if (repeat === "off" && !shuffle && currentIndex === playlist.length - 1) {
      audio.pause();
      audio.currentTime = 0;
      updatePlayButton();
      return;
    }
    playIndex(nextIndex());
  }

  function removeTrack(index) {
    const track = playlist[index];
    if (!track || track.type === "builtin") return;
    if (track.type === "local") {
      URL.revokeObjectURL(track.src);
      deleteLocalTrackFromDb(track.id).catch(() => {});
    } else if (track.type === "url") {
      saveStoredUrls(playlist.filter((_item, itemIndex) => itemIndex !== index));
    }
    const wasCurrent = index === currentIndex;
    playlist.splice(index, 1);
    if (wasCurrent) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      currentIndex = -1;
      updateNowPlaying();
      updatePlayButton();
    } else if (index < currentIndex) {
      currentIndex -= 1;
    }
    renderList();
  }

  async function addLocalFiles(files) {
    let added = 0;
    for (const file of files) {
      if (!file) continue;
      if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|ogg|wav|flac|aac|opus)$/i.test(file.name)) continue;
      const fallbackTitle = file.name.replace(/\.[^.]+$/, "") || t("Local file");
      const tags = await readTags(file);
      const id = makeId("local");
      const title = tags.title || fallbackTitle;
      const artist = tags.artist || DEFAULT_ARTIST;
      playlist.push({ id, title, artist, src: URL.createObjectURL(file), type: "local" });
      saveLocalTrackToDb({ id, title, artist, blob: file, createdAt: Date.now() }).catch(() => {});
      added += 1;
    }
    renderList();
    setStatus(added ? `${t("Added files")}: ${added}` : t("No audio files selected"));
  }

  function addUrlTrack() {
    const value = urlInput.value.trim();
    if (!value) return;
    let url;
    try {
      url = new URL(value, location.href);
    } catch (_error) {
      setStatus(t("Invalid URL"));
      return;
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      setStatus(t("Invalid URL"));
      return;
    }
    const fileName = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    const title = fileName.replace(/\.[^.]+$/, "") || t("Cloud track");
    const track = { id: makeId("url"), title, artist: DEFAULT_ARTIST, src: url.href, type: "url" };
    playlist.push(track);
    saveStoredUrls(playlist);
    urlInput.value = "";
    renderList();
    setStatus(`${t("Added")}: ${title}`);
    readTags(url.href).then((tags) => {
      if (!tags.title && !tags.artist) return;
      if (tags.title) track.title = tags.title;
      if (tags.artist) track.artist = tags.artist;
      saveStoredUrls(playlist);
      renderList();
      if (playlist[currentIndex] === track) updateNowPlaying();
    });
  }

  function applyInitialState() {
    applyInitialTogglePosition();
    applyInitialPanelPosition();
    updateNowPlaying();
    updatePlayButton();
    updateRepeatButton();
    updateShuffleButton();
    renderList();
  }

  function ensureAttached() {
    if (!document.body.contains(toggle)) document.body.append(toggle);
    if (!document.body.contains(panel)) document.body.append(panel);
  }

  window.addEventListener("load", ensureAttached);
  setInterval(ensureAttached, 1000);

  toggle.addEventListener("pointerdown", (event) => {
    const rect = toggle.getBoundingClientRect();
    draggingToggle = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    toggle.setPointerCapture(event.pointerId);
  });
  toggle.addEventListener("pointermove", (event) => {
    if (!draggingToggle || draggingToggle.pointerId !== event.pointerId) return;
    const dx = event.clientX - draggingToggle.startX;
    const dy = event.clientY - draggingToggle.startY;
    if (!draggingToggle.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      draggingToggle.moved = true;
    }
    if (draggingToggle.moved) {
      applyTogglePosition(event.clientX - draggingToggle.offsetX, event.clientY - draggingToggle.offsetY, false);
    }
  });
  const finishToggleDrag = (event) => {
    if (!draggingToggle || draggingToggle.pointerId !== event.pointerId) return;
    const moved = draggingToggle.moved;
    draggingToggle = null;
    if (moved) {
      const rect = toggle.getBoundingClientRect();
      applyTogglePosition(rect.left, rect.top, true);
      suppressToggleClick = true;
      setTimeout(() => { suppressToggleClick = false; }, 0);
    }
  };
  toggle.addEventListener("pointerup", finishToggleDrag);
  toggle.addEventListener("pointercancel", finishToggleDrag);
  toggle.addEventListener("click", (event) => {
    if (suppressToggleClick) {
      suppressToggleClick = false;
      event.preventDefault();
      return;
    }
    const open = panel.classList.toggle("open");
    if (open) applyInitialPanelPosition();
  });

  header.addEventListener("pointerdown", (event) => {
    if (event.target === closeButton) return;
    const rect = panel.getBoundingClientRect();
    draggingPanel = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  header.addEventListener("pointermove", (event) => {
    if (!draggingPanel || draggingPanel.pointerId !== event.pointerId) return;
    applyPanelPosition(event.clientX - draggingPanel.offsetX, event.clientY - draggingPanel.offsetY);
  });
  const stopPanelDrag = (event) => {
    if (draggingPanel && draggingPanel.pointerId === event.pointerId) draggingPanel = null;
  };
  header.addEventListener("pointerup", stopPanelDrag);
  header.addEventListener("pointercancel", stopPanelDrag);

  closeButton.addEventListener("click", () => panel.classList.remove("open"));
  playButton.addEventListener("click", togglePlay);
  previousButton.addEventListener("click", previousTrack);
  nextButton.addEventListener("click", nextTrack);
  repeatButton.addEventListener("click", () => {
    repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    localStorage.setItem(REPEAT_KEY, repeat);
    updateRepeatButton();
  });
  shuffleButton.addEventListener("click", () => {
    shuffle = !shuffle;
    localStorage.setItem(SHUFFLE_KEY, shuffle ? "1" : "0");
    updateShuffleButton();
  });
  randomButton.addEventListener("click", () => {
    if (!playlist.length) return;
    playIndex(randomIndex());
  });
  addFilesButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    addLocalFiles(Array.from(fileInput.files || []));
    fileInput.value = "";
  });
  addUrlButton.addEventListener("click", addUrlTrack);
  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addUrlTrack();
  });
  volume.addEventListener("input", () => {
    audio.volume = Math.min(1, Math.max(0, Number(volume.value) / 100));
    localStorage.setItem(VOLUME_KEY, String(audio.volume));
  });
  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    }
  });

  audio.addEventListener("play", () => {
    autoplayPending = false;
    updatePlayButton();
  });
  audio.addEventListener("pause", updatePlayButton);
  audio.addEventListener("ended", handleEnded);
  audio.addEventListener("timeupdate", () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    currentTimeLabel.textContent = formatTime(audio.currentTime);
    durationLabel.textContent = formatTime(duration);
    if (duration > 0) seek.value = String(Math.round((audio.currentTime / duration) * 1000));
  });
  audio.addEventListener("loadedmetadata", () => {
    durationLabel.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("error", () => {
    setStatus(t("Playback error"));
    updatePlayButton();
  });
  window.addEventListener("resize", () => {
    if (toggle.style.left) {
      const rect = toggle.getBoundingClientRect();
      applyTogglePosition(rect.left, rect.top, false);
    }
    if (panel.classList.contains("open") && panel.style.left) {
      const rect = panel.getBoundingClientRect();
      applyPanelPosition(rect.left, rect.top, false);
    }
  });
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    if (event.key === "Escape" && panel.classList.contains("open")) {
      panel.classList.remove("open");
    }
  });
  window.addEventListener("beforeunload", () => {
    playlist.forEach((track) => {
      if (track.type === "local") URL.revokeObjectURL(track.src);
    });
  });

  applyInitialState();
  if (autoplay) playIndex(0, true, true);

  loadLocalTracksFromDb()
    .then((entries) => {
      const existing = new Set(playlist.map((track) => track.id));
      const restored = entries
        .filter((entry) => entry && entry.id && entry.blob && !existing.has(entry.id))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        .map((entry) => ({
          id: entry.id,
          title: entry.title || t("Local file"),
          artist: entry.artist || DEFAULT_ARTIST,
          src: URL.createObjectURL(entry.blob),
          type: "local",
        }));
      if (restored.length) {
        playlist.push(...restored);
        renderList();
      }
    })
    .catch(() => {});

  return {
    play: () => togglePlay(),
    next: nextTrack,
    previous: previousTrack,
    open: () => { panel.classList.add("open"); applyInitialPanelPosition(); },
    close: () => panel.classList.remove("open"),
  };
}
