export function installRttHook() {
    if (window.__fx && window.__fx.rtt) return;
    const NativeWS = window.WebSocket;

    window.__fx = window.__fx || {};
    window.__fx.rtt = {
        samples: [],
        lastSend: 0,
        MIN_SAMPLES: 5,
        MAX_SAMPLE_MS: 800,
        addSample(v) {
            if (!(v > 0 && v < this.MAX_SAMPLE_MS)) return;
            this.samples.push(v);
            if (this.samples.length > 20) this.samples.shift();
        },
        getMedian() {
            if (this.samples.length < this.MIN_SAMPLES) return 0;
            const s = [...this.samples].sort((a, b) => a - b);
            return s[Math.floor(s.length / 2)];
        },
        getTicks() {
            return this.getMedian() / 2 / 100;
        },
        reset() {
            this.samples.length = 0;
            this.lastSend = 0;
        }
    };

    function wrap(ws) {
        const origSend = ws.send.bind(ws);
        ws.send = function (data) {
            window.__fx.rtt.lastSend = performance.now();
            return origSend(data);
        };

        let handler = null;
        Object.defineProperty(ws, 'onmessage', {
            configurable: true,
            get() { return handler; },
            set(fn) {
                handler = function (ev) {
                    const now = performance.now();
                    if (window.__fx.rtt.lastSend) {
                        window.__fx.rtt.addSample(now - window.__fx.rtt.lastSend);
                        window.__fx.rtt.lastSend = 0;
                    }
                    return fn.call(ws, ev);
                };
            }
        });

        const origAdd = ws.addEventListener.bind(ws);
        ws.addEventListener = function (type, fn, opts) {
            if (type === 'message') {
                const wrapped = function (ev) {
                    const now = performance.now();
                    if (window.__fx.rtt.lastSend) {
                        window.__fx.rtt.addSample(now - window.__fx.rtt.lastSend);
                        window.__fx.rtt.lastSend = 0;
                    }
                    return fn.call(ws, ev);
                };
                return origAdd(type, wrapped, opts);
            }
            return origAdd(type, fn, opts);
        };

        return ws;
    }

    window.WebSocket = new Proxy(NativeWS, {
        construct(target, args) { return wrap(new target(...args)); }
    });

    console.log('[rtt] WebSocket hooked');
}

export function installRttDisplay() {
    const attach = () => {
        const el = document.createElement('div');
        el.id = '__fx_rtt_display';
        el.style.cssText = [
            'position:fixed', 'top:6px', 'left:6px', 'z-index:2147483647',
            'background:#fff', 'color:#000', 'border:2px solid #000',
            'padding:6px 10px', 'font-family:monospace', 'font-size:18px',
            'line-height:1.35', 'white-space:pre', 'pointer-events:none'
        ].join(';');
        (document.body || document.documentElement).appendChild(el);

        setInterval(() => {
            const r = window.__fx && window.__fx.rtt;
            if (!r) { el.textContent = 'rtt: not installed'; return; }
            const med = r.getMedian();
            const ticks = r.getTicks();
            const lines = [
                'RTT  ' + med.toFixed(0) + ' ms   n=' + r.samples.length,
                '1way ' + ticks.toFixed(2) + ' ticks'
            ];
            const oa = window.__fx.openingAutomation;
            if (oa && oa.attacks && oa.nextAttack < oa.attacks.length) {
                const next = oa.attacks[oa.nextAttack];
                if (next) lines.push('next tick ' + next.tick + ' (adj ' + (next.tick - ticks).toFixed(1) + ')');
            }
            el.textContent = lines.join('\n');
        }, 1000);
    };
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach);
}
