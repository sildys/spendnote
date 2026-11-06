// On-screen signature pad (receipt signatures, 070).
// SpendNoteSignaturePad.open(options) -> Promise<{ name, png, method } | null>
(function () {
    'use strict';

    const MAX_DATA_URL_BYTES = 68000; // DB check is 70000 on the whole data URL
    const STYLE_ID = 'sn-sigpad-style';

    const css = `
.sn-sigpad-overlay{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:12px;}
.sn-sigpad-card{background:#fff;border-radius:14px;width:100%;max-width:560px;max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:Inter,Arial,sans-serif;color:#111;}
.sn-sigpad-head{padding:16px 18px 0;}
.sn-sigpad-title{font-size:18px;font-weight:800;margin:0;}
.sn-sigpad-sub{font-size:13px;color:#4b5563;margin-top:2px;}
.sn-sigpad-summary{margin:12px 18px 0;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;line-height:1.5;}
.sn-sigpad-summary .amt{font-size:18px;font-weight:800;color:#047857;}
.sn-sigpad-body{padding:12px 18px 0;}
.sn-sigpad-label{display:block;font-size:12px;font-weight:700;color:#374151;margin:0 0 4px;}
.sn-sigpad-name{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;font-family:inherit;}
.sn-sigpad-name[readonly]{background:#f3f4f6;color:#374151;}
.sn-sigpad-canvas-wrap{position:relative;margin-top:12px;border:2px dashed #cbd5e1;border-radius:10px;background:#fff;}
.sn-sigpad-canvas{display:block;width:100%;height:200px;touch-action:none;cursor:crosshair;border-radius:8px;}
.sn-sigpad-baseline{position:absolute;left:16px;right:16px;bottom:44px;border-bottom:1px solid #9ca3af;pointer-events:none;}
.sn-sigpad-hint{position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:12px;color:#9ca3af;pointer-events:none;}
.sn-sigpad-saved{display:flex;align-items:center;gap:10px;margin-top:10px;padding:8px 10px;border:1px solid #d1fae5;background:#ecfdf5;border-radius:10px;font-size:13px;}
.sn-sigpad-saved img{height:40px;max-width:140px;object-fit:contain;}
.sn-sigpad-note{font-size:12px;color:#6b7280;line-height:1.5;margin:10px 0 0;}
.sn-sigpad-error{font-size:13px;color:#b91c1c;margin:8px 0 0;display:none;}
.sn-sigpad-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding:14px 18px 16px;}
.sn-sigpad-btn{border:1px solid #d1d5db;background:#fff;color:#111;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
.sn-sigpad-btn.primary{background:#059669;border-color:#059669;color:#fff;}
.sn-sigpad-btn.link{border-color:transparent;background:transparent;color:#047857;padding-left:8px;padding-right:8px;}
.sn-sigpad-btn:disabled{opacity:.5;cursor:not-allowed;}
@media (max-width:480px){.sn-sigpad-canvas{height:180px;}.sn-sigpad-actions .sn-sigpad-btn{flex:1 1 auto;}}
`;

    const esc = (v) => (typeof window.spendnoteEscapeHtml === 'function')
        ? window.spendnoteEscapeHtml(v)
        : String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = css;
        document.head.appendChild(s);
    }

    // Crop to the drawn strokes, scale down and keep the data URL under the DB limit.
    function exportTrimmed(canvas, bounds) {
        const pad = 8 * (window.devicePixelRatio || 1);
        const sx = Math.max(0, Math.floor(bounds.minX - pad));
        const sy = Math.max(0, Math.floor(bounds.minY - pad));
        const sw = Math.min(canvas.width - sx, Math.ceil(bounds.maxX - bounds.minX + pad * 2));
        const sh = Math.min(canvas.height - sy, Math.ceil(bounds.maxY - bounds.minY + pad * 2));
        let targetW = Math.min(600, sw);
        for (let i = 0; i < 6; i++) {
            const scale = targetW / sw;
            const out = document.createElement('canvas');
            out.width = Math.max(1, Math.round(sw * scale));
            out.height = Math.max(1, Math.round(sh * scale));
            out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
            const url = out.toDataURL('image/png');
            if (url.length <= MAX_DATA_URL_BYTES) return url;
            targetW = Math.round(targetW * 0.75);
        }
        return null;
    }

    function open(options) {
        const opts = options || {};
        ensureStyle();

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'sn-sigpad-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            const saved = opts.savedSignaturePng ? String(opts.savedSignaturePng) : '';
            const nameLocked = Boolean(opts.nameLocked);

            overlay.innerHTML = `
<div class="sn-sigpad-card">
  <div class="sn-sigpad-head">
    <h2 class="sn-sigpad-title">${esc(opts.title || 'Sign receipt')}</h2>
    ${opts.subtitle ? `<div class="sn-sigpad-sub">${esc(opts.subtitle)}</div>` : ''}
  </div>
  ${opts.summaryHtml ? `<div class="sn-sigpad-summary">${opts.summaryHtml}</div>` : ''}
  <div class="sn-sigpad-body">
    <label class="sn-sigpad-label" for="snSigpadName">Name</label>
    <input class="sn-sigpad-name" id="snSigpadName" type="text" maxlength="120" autocomplete="off" value="${esc(opts.defaultName || '')}" ${nameLocked ? 'readonly' : ''}>
    ${saved ? `<div class="sn-sigpad-saved"><img alt="Your saved signature" src="${esc(saved)}"><button type="button" class="sn-sigpad-btn primary" data-act="saved">Use my saved signature</button></div>` : ''}
    <div class="sn-sigpad-canvas-wrap">
      <canvas class="sn-sigpad-canvas" aria-label="Signature area"></canvas>
      <div class="sn-sigpad-baseline"></div>
      <div class="sn-sigpad-hint">Sign above the line with your finger or mouse</div>
    </div>
    <p class="sn-sigpad-note">By signing you confirm the amount and details above.${opts.privacyNote ? ' ' + esc(opts.privacyNote) : ''} A signature can't be changed after it is saved.</p>
    <p class="sn-sigpad-error" role="alert"></p>
  </div>
  <div class="sn-sigpad-actions">
    <button type="button" class="sn-sigpad-btn link" data-act="clear">Clear</button>
    <button type="button" class="sn-sigpad-btn" data-act="cancel">Cancel</button>
    <button type="button" class="sn-sigpad-btn primary" data-act="done" disabled>${esc(opts.doneLabel || 'Save signature')}</button>
  </div>
</div>`;

            document.body.appendChild(overlay);
            const prevOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            const canvas = overlay.querySelector('canvas');
            const nameInput = overlay.querySelector('#snSigpadName');
            const doneBtn = overlay.querySelector('[data-act="done"]');
            const hint = overlay.querySelector('.sn-sigpad-hint');
            const errorEl = overlay.querySelector('.sn-sigpad-error');
            const ctx = canvas.getContext('2d');

            let drawing = false;
            let hasInk = false;
            let last = null;
            let bounds = null;

            const setupCanvas = () => {
                const ratio = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = Math.max(1, Math.round(rect.width * ratio));
                canvas.height = Math.max(1, Math.round(rect.height * ratio));
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 2.6 * ratio;
                hasInk = false;
                bounds = null;
                hint.style.display = '';
                updateDone();
            };

            const showError = (msg) => {
                errorEl.textContent = msg || '';
                errorEl.style.display = msg ? 'block' : 'none';
            };

            const updateDone = () => {
                doneBtn.disabled = !(hasInk && nameInput.value.trim());
            };

            const point = (ev) => {
                const rect = canvas.getBoundingClientRect();
                const ratio = canvas.width / rect.width;
                return { x: (ev.clientX - rect.left) * ratio, y: (ev.clientY - rect.top) * ratio };
            };

            const grow = (p) => {
                const r = ctx.lineWidth;
                if (!bounds) bounds = { minX: p.x - r, minY: p.y - r, maxX: p.x + r, maxY: p.y + r };
                else {
                    bounds.minX = Math.min(bounds.minX, p.x - r);
                    bounds.minY = Math.min(bounds.minY, p.y - r);
                    bounds.maxX = Math.max(bounds.maxX, p.x + r);
                    bounds.maxY = Math.max(bounds.maxY, p.y + r);
                }
            };

            canvas.addEventListener('pointerdown', (ev) => {
                ev.preventDefault();
                try { canvas.setPointerCapture(ev.pointerId); } catch (_) {}
                drawing = true;
                last = point(ev);
                grow(last);
                ctx.beginPath();
                ctx.arc(last.x, last.y, ctx.lineWidth / 2, 0, Math.PI * 2);
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
                hint.style.display = 'none';
                showError('');
            });
            canvas.addEventListener('pointermove', (ev) => {
                if (!drawing) return;
                ev.preventDefault();
                const events = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [ev];
                for (const e of (events.length ? events : [ev])) {
                    const p = point(e);
                    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
                    ctx.beginPath();
                    ctx.moveTo(last.x, last.y);
                    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                    grow(p);
                    last = p;
                }
                if (!hasInk) { hasInk = true; updateDone(); }
            });
            const stop = () => {
                if (drawing && bounds && !hasInk) { hasInk = true; updateDone(); }
                drawing = false;
                last = null;
            };
            canvas.addEventListener('pointerup', stop);
            canvas.addEventListener('pointercancel', stop);
            canvas.addEventListener('lostpointercapture', stop);

            nameInput.addEventListener('input', updateDone);

            const close = (result) => {
                window.removeEventListener('resize', onResize);
                document.removeEventListener('keydown', onKey);
                document.body.style.overflow = prevOverflow;
                overlay.remove();
                resolve(result);
            };

            // Resizing clears the drawing; only redo it while the pad is still empty.
            const onResize = () => { if (!hasInk) setupCanvas(); };
            const onKey = (ev) => { if (ev.key === 'Escape') close(null); };
            window.addEventListener('resize', onResize);
            document.addEventListener('keydown', onKey);

            overlay.addEventListener('click', (ev) => {
                const act = ev.target?.closest?.('[data-act]')?.getAttribute('data-act');
                if (!act) return;
                if (act === 'clear') { setupCanvas(); return; }
                if (act === 'cancel') { close(null); return; }
                const name = nameInput.value.trim();
                if (!name) { showError('Please enter a name.'); nameInput.focus(); return; }
                if (act === 'saved') { close({ name, png: null, method: 'saved' }); return; }
                if (act === 'done') {
                    if (!hasInk || !bounds) { showError('Please sign in the box first.'); return; }
                    const png = exportTrimmed(canvas, bounds);
                    if (!png) { showError('The signature is too large. Please clear it and sign again.'); return; }
                    close({ name, png, method: 'drawn' });
                }
            });

            requestAnimationFrame(setupCanvas);
        });
    }

    window.SpendNoteSignaturePad = { open };
})();
