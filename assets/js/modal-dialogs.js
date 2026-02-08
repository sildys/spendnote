// ============================================
// SpendNote Branded Modal Dialogs
// Replaces native alert(), confirm(), prompt()
// Promise-based API: showAlert, showConfirm, showPrompt
// ============================================

(function () {
    'use strict';

    const MODAL_Z = 99999;
    let activeDialog = null;

    // --- Helpers ---
    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'sn-dialog-overlay';
        overlay.style.cssText = `position:fixed;inset:0;z-index:${MODAL_Z};background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .18s ease;`;
        return overlay;
    }

    function animateIn(overlay) {
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    }

    function animateOut(overlay) {
        overlay.style.opacity = '0';
        return new Promise(r => setTimeout(r, 180));
    }

    function iconHtml(type) {
        const map = {
            info:    { icon: 'fa-circle-info',      color: 'var(--primary)' },
            success: { icon: 'fa-circle-check',      color: 'var(--success, #059669)' },
            warning: { icon: 'fa-triangle-exclamation', color: 'var(--warning, #f59e0b)' },
            error:   { icon: 'fa-circle-xmark',      color: 'var(--error, #ef4444)' },
            confirm: { icon: 'fa-circle-question',    color: 'var(--primary)' },
            prompt:  { icon: 'fa-pen-to-square',      color: 'var(--primary)' },
            danger:  { icon: 'fa-triangle-exclamation', color: 'var(--error, #ef4444)' }
        };
        const m = map[type] || map.info;
        return `<div class="sn-dialog-icon" style="color:${m.color}"><i class="fas ${m.icon}"></i></div>`;
    }

    function buildCard(bodyHtml) {
        return `<div class="sn-dialog-card">${bodyHtml}</div>`;
    }

    function btnHtml(label, cls, id) {
        return `<button class="sn-dialog-btn ${cls}" id="${id}">${esc(label)}</button>`;
    }

    // --- Core render ---
    function renderDialog(opts) {
        if (activeDialog) {
            activeDialog.resolve(opts.type === 'confirm' ? false : (opts.type === 'prompt' ? null : undefined));
            activeDialog.overlay.remove();
            activeDialog = null;
        }

        return new Promise((resolve) => {
            const overlay = createOverlay();

            let body = iconHtml(opts.iconType || opts.type || 'info');

            if (opts.title) {
                body += `<div class="sn-dialog-title">${esc(opts.title)}</div>`;
            }

            if (opts.message) {
                const lines = String(opts.message).split('\n');
                body += `<div class="sn-dialog-message">${lines.map(l => esc(l)).join('<br>')}</div>`;
            }

            if (opts.type === 'prompt') {
                const ph = opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : '';
                const val = opts.defaultValue != null ? ` value="${esc(String(opts.defaultValue))}"` : '';
                body += `<input type="text" class="sn-dialog-input" id="snDialogInput"${ph}${val} autocomplete="off" />`;
            }

            // Buttons
            body += '<div class="sn-dialog-actions">';
            if (opts.type === 'alert') {
                body += btnHtml(opts.okLabel || 'OK', 'sn-dialog-btn-primary', 'snDialogOk');
            } else if (opts.type === 'confirm') {
                body += btnHtml(opts.cancelLabel || 'Cancel', 'sn-dialog-btn-secondary', 'snDialogCancel');
                body += btnHtml(opts.okLabel || 'OK', opts.danger ? 'sn-dialog-btn-danger' : 'sn-dialog-btn-primary', 'snDialogOk');
            } else if (opts.type === 'prompt') {
                body += btnHtml(opts.cancelLabel || 'Cancel', 'sn-dialog-btn-secondary', 'snDialogCancel');
                body += btnHtml(opts.okLabel || 'OK', 'sn-dialog-btn-primary', 'snDialogOk');
            }
            body += '</div>';

            overlay.innerHTML = buildCard(body);
            document.body.appendChild(overlay);
            animateIn(overlay);

            const okBtn = overlay.querySelector('#snDialogOk');
            const cancelBtn = overlay.querySelector('#snDialogCancel');
            const inputEl = overlay.querySelector('#snDialogInput');

            activeDialog = { overlay, resolve };

            function close(value) {
                if (!activeDialog || activeDialog.overlay !== overlay) return;
                activeDialog = null;
                animateOut(overlay).then(() => {
                    overlay.remove();
                    resolve(value);
                });
            }

            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    if (opts.type === 'prompt') {
                        close(inputEl ? inputEl.value : '');
                    } else if (opts.type === 'confirm') {
                        close(true);
                    } else {
                        close(undefined);
                    }
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    close(opts.type === 'prompt' ? null : false);
                });
            }

            // Overlay click = cancel/dismiss
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (opts.type === 'confirm') close(false);
                    else if (opts.type === 'prompt') close(null);
                    else close(undefined);
                }
            });

            // Keyboard
            function onKey(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    if (opts.type === 'confirm') close(false);
                    else if (opts.type === 'prompt') close(null);
                    else close(undefined);
                }
                if (e.key === 'Enter' && opts.type !== 'prompt') {
                    e.preventDefault();
                    if (opts.type === 'confirm') close(true);
                    else close(undefined);
                }
                if (e.key === 'Enter' && opts.type === 'prompt' && document.activeElement === inputEl) {
                    e.preventDefault();
                    close(inputEl ? inputEl.value : '');
                }
            }
            overlay.addEventListener('keydown', onKey);

            // Focus
            if (inputEl) {
                inputEl.focus();
                inputEl.select();
            } else if (okBtn) {
                okBtn.focus();
            }
        });
    }

    // --- Public API ---

    /**
     * showAlert(message, opts?)
     * opts: { title, iconType, okLabel }
     * iconType: 'info' | 'success' | 'warning' | 'error'
     * Returns: Promise<void>
     */
    window.showAlert = function (message, opts) {
        opts = Object.assign({}, opts || {});
        opts.type = 'alert';
        opts.message = message;
        return renderDialog(opts);
    };

    /**
     * showConfirm(message, opts?)
     * opts: { title, iconType, okLabel, cancelLabel, danger }
     * Returns: Promise<boolean>
     */
    window.showConfirm = function (message, opts) {
        opts = Object.assign({}, opts || {});
        opts.type = 'confirm';
        opts.message = message;
        return renderDialog(opts);
    };

    /**
     * showPrompt(message, opts?)
     * opts: { title, iconType, okLabel, cancelLabel, defaultValue, placeholder }
     * Returns: Promise<string|null>  (null if cancelled)
     */
    window.showPrompt = function (message, opts) {
        opts = Object.assign({}, opts || {});
        opts.type = 'prompt';
        opts.message = message;
        return renderDialog(opts);
    };

})();
