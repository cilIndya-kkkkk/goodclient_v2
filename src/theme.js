import { getSettings } from "./settings.js";

const STYLE_ID = "fxAnimeThemeStyle";
const CSS = `
body.fx-anime-theme {
	background: linear-gradient(160deg, #fff9e8 0%, #e8f8e8 55%, #fff3c4 100%);
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
	background: linear-gradient(135deg, rgba(217, 245, 227, 0.22), rgba(255, 224, 138, 0.16) 55%, rgba(255, 217, 230, 0.14));
	mix-blend-mode: soft-light;
}

body.fx-anime-theme #fxAnimeTint {
	display: block;
}

body.fx-anime-theme ::selection {
	background: #ffe08a;
	color: #3d4a34;
}

body.fx-anime-theme .window {
	background: linear-gradient(155deg, rgba(255, 253, 245, 0.98), rgba(217, 245, 227, 0.96)) !important;
	color: #3d4a34 !important;
	border: 2px solid #a8d8b0 !important;
	border-radius: 18px !important;
	box-shadow: 0 10px 30px rgba(80, 140, 100, 0.22), inset 0 1px 0 #fff !important;
}

body.fx-anime-theme .window h1,
body.fx-anime-theme .window h2,
body.fx-anime-theme .window h3 {
	color: #2f7a52 !important;
	text-shadow: 0 1px 0 #fff;
}

body.fx-anime-theme .window p,
body.fx-anime-theme .window label,
body.fx-anime-theme .window small,
body.fx-anime-theme .window span,
body.fx-anime-theme .window div {
	color: #3d4a34 !important;
}

body.fx-anime-theme .window a {
	color: #2f7a52 !important;
}

body.fx-anime-theme .window button,
body.fx-anime-theme .window input,
body.fx-anime-theme .window select,
body.fx-anime-theme .window textarea {
	background: #fffdf5 !important;
	color: #3d4a34 !important;
	border: 1px solid #a8d8b0 !important;
	border-radius: 10px !important;
}

body.fx-anime-theme .window button {
	background: linear-gradient(135deg, #d9f5e3, #fff3c4) !important;
	border-radius: 999px !important;
	font-weight: 700;
	box-shadow: 0 3px 10px rgba(80, 140, 100, 0.22) !important;
}

body.fx-anime-theme .window button:hover:not(:disabled) {
	filter: brightness(1.04) saturate(1.05);
}

body.fx-anime-theme .window hr {
	border-color: #c9e8cf !important;
}

body.fx-anime-theme .window .scrollable {
	scrollbar-color: #a8d8b0 #fff9e8;
}

body.fx-anime-theme .window .checkbox .checkmark {
	background: #fffdf5 !important;
	border-color: #9fce9f !important;
}

body.fx-anime-theme ::-webkit-scrollbar {
	width: 10px;
	height: 10px;
}

body.fx-anime-theme ::-webkit-scrollbar-track {
	background: #fff9e8;
}

body.fx-anime-theme ::-webkit-scrollbar-thumb {
	background: #a8d8b0;
	border-radius: 999px;
}

body.fx-anime-theme #fxToolbox {
	background: linear-gradient(160deg, rgba(255, 253, 245, 0.98), rgba(217, 245, 227, 0.96)) !important;
	border: 2px solid #a8d8b0 !important;
	border-radius: 18px !important;
	box-shadow: 0 12px 34px rgba(80, 140, 100, 0.25) !important;
	color: #3d4a34 !important;
}

body.fx-anime-theme #fxToolboxHeader {
	background: linear-gradient(90deg, #d9f5e3, #fff3c4) !important;
	color: #2f6b4f !important;
	border-bottom: 1px solid #a8d8b0 !important;
}

body.fx-anime-theme .fx-toolbox-section {
	background: rgba(255, 255, 255, 0.62) !important;
	border: 1px solid #c9e8cf !important;
	border-radius: 12px !important;
}

body.fx-anime-theme .fx-toolbox-section h3 {
	color: #2f7a52 !important;
}

body.fx-anime-theme .fx-toolbox-button {
	background: linear-gradient(135deg, #fff9e8, #e8f8e8) !important;
	color: #3d4a34 !important;
	border: 1px solid #a8d8b0 !important;
	border-radius: 999px !important;
}

body.fx-anime-theme .fx-toolbox-button.active {
	background: linear-gradient(135deg, #b7efc9, #ffe08a) !important;
	color: #5a451f !important;
	border-color: #7fd8c8 !important;
}

body.fx-anime-theme .fx-toolbox-input {
	background: #fffdf5 !important;
	color: #3d4a34 !important;
	border: 1px solid #a8d8b0 !important;
	border-radius: 10px !important;
}

body.fx-anime-theme .fx-toolbox-status {
	color: #3f7a52 !important;
}

body.fx-anime-theme .fx-toolbox-status.bad {
	color: #b33a3a !important;
}

body.fx-anime-theme .fx-toolbox-note {
	color: #5f7a62 !important;
}

body.fx-anime-theme #fxToolboxToggle {
	background: linear-gradient(135deg, #d9f5e3, #fff3c4) !important;
	color: #3d4a34 !important;
	border: 2px solid #a8d8b0 !important;
	border-radius: 999px !important;
	box-shadow: 0 6px 18px rgba(80, 140, 100, 0.3) !important;
}

body.fx-anime-theme #fxToolboxToggle.dragging {
	cursor: grabbing;
}

body.fx-anime-theme #demonAutomationControls {
	background: linear-gradient(160deg, rgba(255, 250, 253, 0.97), rgba(236, 251, 255, 0.97)) !important;
	border: 2px solid #a8d8b0 !important;
	border-radius: 14px !important;
	box-shadow: 0 8px 24px rgba(80, 140, 100, 0.24) !important;
	color: #3d4a34 !important;
}

body.fx-anime-theme #demonAutomationControls .drag-handle {
	background: linear-gradient(90deg, #d9f5e3, #fff3c4) !important;
	color: #7a4b1f !important;
	border: 1px solid #a8d8b0 !important;
	border-radius: 8px !important;
}

body.fx-anime-theme #demonAutomationControls button {
	background: linear-gradient(135deg, #fff9e8, #e8f8e8) !important;
	color: #3d4a34 !important;
	border: 1px solid #a8d8b0 !important;
	border-radius: 8px !important;
}

body.fx-anime-theme #demonAutomationControls button.active {
	background: linear-gradient(135deg, #b7efc9, #ffe08a) !important;
	color: #5a451f !important;
}

body.fx-anime-theme #demonAutomationControls .bot-rate-control {
	color: #3d4a34 !important;
}

body.fx-anime-theme #playerlist_content {
	background: #fffdf5 !important;
	color: #3d4a34 !important;
}

body.fx-anime-theme #playerlist_content tr {
	border-color: #c9e8cf !important;
}

body.fx-anime-theme input[type="range"] {
	accent-color: #4f9a6a;
}

body.fx-anime-theme .window input[type="checkbox"] {
	accent-color: #b8860b !important;
}

body.fx-anime-theme .window .checkbox .checkmark {
	border: 2px solid #4f8a5f !important;
	background: #fffdf5 !important;
}

body.fx-anime-theme .window .checkbox input:checked + .checkmark {
	background: #8fd6a5 !important;
	border-color: #3f7a52 !important;
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
