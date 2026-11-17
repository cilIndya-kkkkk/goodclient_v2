const PANEL_ID = "fxOpeningDebugPanel";

function formatEvent(event) {
    if (!event || typeof event !== "object") return String(event);
    switch (event.type) {
        case "start":
            return `start stopAt=${JSON.stringify(event.stopAt)} delay=${JSON.stringify(event.cancelDelay)} off=${event.tickOffset} n=${event.attacks} rtt=${Number(event.rttTicks || 0).toFixed(2)}`;
        case "attack":
            return `A tick=${event.tick} sched=${event.scheduledTick} late=${event.lateBy} p=${Number(event.percent || 0).toFixed(2)} rtt=${Number(event.rttTicks || 0).toFixed(2)}`;
        case "cancel-sched":
            return `CS tick=${event.tick} c=${event.cycle} slot=${event.slotAbs} d=${event.delay} rtt=${Number(event.rttTicks || 0).toFixed(2)}`;
        case "cancel-fire":
            return `CF tick=${event.tick} c=${event.cycle} slot=${event.slotAbs} d=${event.delay} rtt=${Number(event.rttTicks || 0).toFixed(2)} srv~${Math.round(event.expectedServerTick)} earliest=${Number.isFinite(event.earliest) ? event.earliest : "-"}`;
        case "land":
            return `L tick=${event.tick} c=${event.cycle} land=${event.land} d=${event.delta}`;
        default:
            return JSON.stringify(event);
    }
}

function downloadText(text, filename) {
    try {
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        console.error("[opening-debug] download failed", error);
    }
}

export function initOpeningDebugOverlay() {
    if (document.getElementById(PANEL_ID)) return;

    const root = document.createElement("span");
    root.id = PANEL_ID;
    root.style.cssText = [
        "position:fixed", "left:8px", "bottom:8px", "z-index:2147483646",
        "display:block", "width:min(460px,92vw)", "max-height:min(60vh,520px)",
        "background:rgba(0,0,0,.88)", "color:#b8ffb8", "border:2px solid #3f3",
        "border-radius:6px", "font:12px/1.35 monospace", "box-shadow:0 4px 18px rgba(0,0,0,.5)",
        "user-select:text", "touch-action:manipulation"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = "display:flex;gap:4px;align-items:center;padding:4px 6px;background:#062;color:#dff;cursor:move;user-select:none;touch-action:none;";
    const title = document.createElement("span");
    title.textContent = "FX Opening Debug";
    title.style.cssText = "flex:1;font-weight:bold;";
    header.appendChild(title);

    const makeButton = (label, handler) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.style.cssText = "font:11px monospace;padding:2px 5px;background:#111;color:#cff;border:1px solid #4f4;border-radius:3px;cursor:pointer;";
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            handler();
        });
        header.appendChild(button);
        return button;
    };

    const status = document.createElement("div");
    status.style.cssText = "padding:4px 6px;border-bottom:1px solid #264;white-space:pre-wrap;color:#9df;";

    const log = document.createElement("pre");
    log.style.cssText = "margin:0;padding:4px 6px;overflow:auto;max-height:calc(min(60vh,520px) - 70px);white-space:pre-wrap;word-break:break-word;color:#b8ffb8;";

    root.appendChild(header);
    root.appendChild(status);
    root.appendChild(log);
    document.body.appendChild(root);

    let lastEventCount = -1;
    let lastEvents = [];

    const getAutomation = () => window.__fx && window.__fx.openingAutomation;

    const enable = () => {
        const automation = getAutomation();
        if (automation && typeof automation.setDebug === "function") automation.setDebug(true);
    };

    const copyLog = async () => {
        const text = JSON.stringify(lastEvents, null, 2);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                title.textContent = "FX Opening Debug (copied)";
                setTimeout(() => { title.textContent = "FX Opening Debug"; }, 1200);
                return;
            }
        } catch (_error) {}
        downloadText(text, `opening-debug-${Date.now()}.json`);
    };

    makeButton("Debug", enable);
    makeButton("Clear", enable);
    makeButton("Copy", copyLog);
    makeButton("Save", () => downloadText(JSON.stringify(lastEvents, null, 2), `opening-debug-${Date.now()}.json`));
    makeButton("Hide", () => { root.style.display = "none"; });

    let mini = null;
    const showMini = () => {
        if (mini) return;
        mini = document.createElement("span");
        mini.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;display:block;";
        const button = document.createElement("button");
        button.textContent = "DBG";
        button.style.cssText = "font:12px monospace;padding:4px 7px;background:#062;color:#cff;border:2px solid #3f3;border-radius:4px;";
        button.addEventListener("click", () => {
            root.style.display = "block";
            mini.remove();
            mini = null;
        });
        mini.appendChild(button);
        document.body.appendChild(mini);
    };
    makeButton("Min", () => { root.style.display = "none"; showMini(); });

    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    header.addEventListener("pointerdown", (event) => {
        if (event.target && event.target.tagName === "BUTTON") return;
        dragging = true;
        const rect = root.getBoundingClientRect();
        dragX = event.clientX - rect.left;
        dragY = event.clientY - rect.top;
        root.style.left = rect.left + "px";
        root.style.top = rect.top + "px";
        root.style.bottom = "auto";
        try { header.setPointerCapture(event.pointerId); } catch (_error) {}
        event.preventDefault();
    });
    header.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const maxX = Math.max(0, window.innerWidth - root.offsetWidth);
        const maxY = Math.max(0, window.innerHeight - root.offsetHeight);
        root.style.left = Math.max(0, Math.min(maxX, event.clientX - dragX)) + "px";
        root.style.top = Math.max(0, Math.min(maxY, event.clientY - dragY)) + "px";
    });
    const stopDrag = () => { dragging = false; };
    header.addEventListener("pointerup", stopDrag);
    header.addEventListener("pointercancel", stopDrag);

    enable();

    const render = () => {
        const automation = getAutomation();
        const rtt = window.__fx && window.__fx.rtt;
        const median = rtt && typeof rtt.getMedian === "function" ? rtt.getMedian() : 0;
        const ticks = rtt && typeof rtt.getTicks === "function" ? rtt.getTicks() : 0;
        const events = automation && typeof automation.dumpDebug === "function" ? automation.dumpDebug() : [];
        lastEvents = events;
        const stopAt = automation && Array.isArray(automation.stopAtByCycle) ? automation.stopAtByCycle : null;
        const delay = automation && Array.isArray(automation.cancelDelayByCycle) ? automation.cancelDelayByCycle : null;
        const attacks = automation && Array.isArray(automation.attacks) ? automation.attacks.length : 0;
        const next = automation && Number.isFinite(automation.nextAttack) ? automation.nextAttack : 0;
        const offset = automation && Number.isFinite(automation.tickOffset) ? automation.tickOffset : 0;
        status.textContent =
            `RTT ${Number(median || 0).toFixed(0)}ms · 1way ${Number(ticks || 0).toFixed(2)}t · off ${offset}\n` +
            `stopAt ${stopAt ? JSON.stringify(stopAt) : "-"}\n` +
            `delay  ${delay ? JSON.stringify(delay) : "-"} · attacks ${next}/${attacks}`;
        if (events.length !== lastEventCount || log.dataset.autoScroll === "1") {
            lastEventCount = events.length;
            const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
            log.textContent = events.slice(-80).map(formatEvent).join("\n");
            log.dataset.autoScroll = atBottom || events.length < 2 ? "1" : "0";
            if (log.dataset.autoScroll === "1") log.scrollTop = log.scrollHeight;
        }
    };

    setInterval(render, 250);
    render();
    console.log("[opening-debug] overlay ready");
}
