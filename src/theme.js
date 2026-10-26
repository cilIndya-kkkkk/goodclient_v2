import { getSettings } from "./settings.js";

const STYLE_ID = "fxAnimeThemeStyle";
const CSS = `
body.fx-anime-theme {
	background: linear-gradient(160deg, #fff7fb 0%, #eefbff 55%, #f3fff9 100%);
}

body.fx-anime-theme #canvasA {
	filter: saturate(1.14) brightness(1.05) contrast(0.98);
}

#fxAnimeTint {
	position: fixed;
	inset: 0;
	z-index: 1;
	display: none;
	pointer-events: none;
	background: linear-gradient(135deg, rgba(255, 182, 213, 0.2), rgba(160, 240, 220, 0.16) 55%, rgba(180, 220, 255, 0.16));
	mix-blend-mode: soft-light;
}

body.fx-anime-theme #fxAnimeTint {
	display: block;
}

body.fx-anime-theme ::selection {
	background: #ffc4dc;
	color: #4c3b53;
}

body.fx-anime-theme .window {
	background: linear-gradient(155deg, rgba(255, 250, 253, 0.98), rgba(236, 251, 255, 0.98)) !important;
	color: #4c3b53 !important;
	border: 2px solid #ffc3dc !important;
	border-radius: 18px !important;
	box-shadow: 0 10px 30px rgba(255, 150, 190, 0.22), inset 0 1px 0 #fff !important;
}

body.fx-anime-theme .window h1,
body.fx-anime-theme .window h2,
body.fx-anime-theme .window h3 {
	color: #d85c8f !important;
	text-shadow: 0 1px 0 #fff;
}

body.fx-anime-theme .window p,
body.fx-anime-theme .window label,
body.fx-anime-theme .window small,
body.fx-anime-theme .window span,
body.fx-anime-theme .window div {
	color: #4c3b53 !important;
}

body.fx-anime-theme .window a {
	color: #d85c8f !important;
}

body.fx-anime-theme .window button,
body.fx-anime-theme .window input,
body.fx-anime-theme .window select,
body.fx-anime-theme .window textarea {
	background: #fffafd !important;
	color: #4c3b53 !important;
	border: 1px solid #eab8d0 !important;
	border-radius: 10px !important;
}

body.fx-anime-theme .window button {
	background: linear-gradient(135deg, #ffd8e8, #c9f5e8) !important;
	border-radius: 999px !important;
	font-weight: 700;
	box-shadow: 0 3px 10px rgba(255, 150, 190, 0.22) !important;
}

body.fx-anime-theme .window button:hover:not(:disabled) {
	filter: brightness(1.04) saturate(1.05);
}

body.fx-anime-theme .window hr {
	border-color: #ffd3e4 !important;
}

body.fx-anime-theme .window .scrollable {
	scrollbar-color: #ffb7d5 #fff1f7;
}

body.fx-anime-theme .window .checkbox .checkmark {
	background: #fffafd !important;
	border-color: #e6b8cf !important;
}

body.fx-anime-theme ::-webkit-scrollbar {
	width: 10px;
	height: 10px;
}

body.fx-anime-theme ::-webkit-scrollbar-track {
	background: #fff1f7;
}

body.fx-anime-theme ::-webkit-scrollbar-thumb {
	background: #ffb7d5;
	border-radius: 999px;
}

body.fx-anime-theme #fxToolbox {
	background: linear-gradient(160deg, rgba(255, 250, 253, 0.98), rgba(236, 251, 255, 0.98)) !important;
	border: 2px solid #ffc3dc !important;
	border-radius: 18px !important;
	box-shadow: 0 12px 34px rgba(255, 150, 190, 0.25) !important;
	color: #4c3b53 !important;
}

body.fx-anime-theme #fxToolboxHeader {
	background: linear-gradient(90deg, #ffd8e8, #d4f8ed) !important;
	color: #b24e7d !important;
	border-bottom: 1px solid #ffc3dc !important;
}

body.fx-anime-theme .fx-toolbox-section {
	background: rgba(255, 255, 255, 0.62) !important;
	border: 1px solid #ffd3e4 !important;
	border-radius: 12px !important;
}

body.fx-anime-theme .fx-toolbox-section h3 {
	color: #d85c8f !important;
}

body.fx-anime-theme .fx-toolbox-button {
	background: linear-gradient(135deg, #fff0f7, #e8fbf4) !important;
	color: #4c3b53 !important;
	border: 1px solid #ffb7d5 !important;
	border-radius: 999px !important;
}

body.fx-anime-theme .fx-toolbox-button.active {
	background: linear-gradient(135deg, #bff6e7, #ffd6e8) !important;
	color: #2f6f5e !important;
	border-color: #7fd8c8 !important;
}

body.fx-anime-theme .fx-toolbox-input {
	background: #fffafd !important;
	color: #4c3b53 !important;
	border: 1px solid #eab8d0 !important;
	border-radius: 10px !important;
}

body.fx-anime-theme .fx-toolbox-status {
	color: #4b8d7a !important;
}

body.fx-anime-theme .fx-toolbox-status.bad {
	color: #d94f6a !important;
}

body.fx-anime-theme .fx-toolbox-note {
	color: #937f9c !important;
}

body.fx-anime-theme #fxToolboxToggle {
	background: linear-gradient(135deg, #ffd8e8, #c9f5e8) !important;
	color: #4c3b53 !important;
	border: 2px solid #ffb7d5 !important;
	border-radius: 999px !important;
	box-shadow: 0 6px 18px rgba(255, 150, 190, 0.3) !important;
}

body.fx-anime-theme #fxToolboxToggle.dragging {
	cursor: grabbing;
}

body.fx-anime-theme #demonAutomationControls {
	background: linear-gradient(160deg, rgba(255, 250, 253, 0.97), rgba(236, 251, 255, 0.97)) !important;
	border: 2px solid #ffc3dc !important;
	border-radius: 14px !important;
	box-shadow: 0 8px 24px rgba(255, 150, 190, 0.24) !important;
	color: #4c3b53 !important;
}

body.fx-anime-theme #demonAutomationControls .drag-handle {
	background: linear-gradient(90deg, #ffd8e8, #d4f8ed) !important;
	color: #b24e7d !important;
	border: 1px solid #ffc3dc !important;
	border-radius: 8px !important;
}

body.fx-anime-theme #demonAutomationControls button {
	background: linear-gradient(135deg, #fff0f7, #e8fbf4) !important;
	color: #4c3b53 !important;
	border: 1px solid #ffb7d5 !important;
	border-radius: 8px !important;
}

body.fx-anime-theme #demonAutomationControls button.active {
	background: linear-gradient(135deg, #bff6e7, #ffd6e8) !important;
	color: #2f6f5e !important;
}

body.fx-anime-theme #demonAutomationControls .bot-rate-control {
	color: #4c3b53 !important;
}

body.fx-anime-theme #playerlist_content {
	background: #fffafd !important;
	color: #4c3b53 !important;
}

body.fx-anime-theme #playerlist_content tr {
	border-color: #ffd3e4 !important;
}

body.fx-anime-theme input[type="range"] {
	accent-color: #ff9fc4;
}
`;

export default function initTheme() {
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement("style");
		style.id = STYLE_ID;
		style.textContent = CSS;
		(document.head || document.documentElement).append(style);
	}

	function ensureTint() {
		if (!document.body) return;
		let tint = document.getElementById("fxAnimeTint");
		if (!tint) {
			tint = document.createElement("div");
			tint.id = "fxAnimeTint";
			document.body.append(tint);
		}
	}

	function apply() {
		if (!document.body) return;
		ensureTint();
		document.body.classList.toggle("fx-anime-theme", Boolean(getSettings().animeThemeEnabled));
	}

	if (document.body) apply();
	else document.addEventListener("DOMContentLoaded", apply, { once: true });
	window.addEventListener("load", apply);

	return { apply };
}
