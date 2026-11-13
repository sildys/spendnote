// "Done & Sign" in the new-transaction form: both sides sign, then share / print.
// SpendNoteSignFlow.run({ transactionId, buildReceiptUrl(format, extraParams), receiptInSameTab }) -> Promise<void>
(function () {
    'use strict';

    const STYLE_ID = 'sn-signflow-style';
    const PDF_TIMEOUT_MS = 45000;

    const css = `
.sn-signflow-overlay{position:fixed;inset:0;z-index:10040;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:12px;}
body.modal-open>.sn-signflow-overlay{pointer-events:auto!important;user-select:auto!important;}
.sn-signflow-card{background:#fff;border-radius:14px;width:100%;max-width:440px;max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:Inter,Arial,sans-serif;color:#111;padding:22px 20px 18px;text-align:center;}
.sn-signflow-icon{width:52px;height:52px;border-radius:50%;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:22px;background:#ecfdf5;color:#059669;}
.sn-signflow-icon.partial{background:#fffbeb;color:#d97706;}
.sn-signflow-icon.none{background:#f1f5f9;color:#475569;}
.sn-signflow-title{font-size:19px;font-weight:800;margin:0;}
.sn-signflow-sub{font-size:13px;color:#4b5563;margin-top:4px;}
.sn-signflow-slots{list-style:none;margin:14px 0 0;padding:0;border:1px solid #e5e7eb;border-radius:10px;text-align:left;}
.sn-signflow-slots li{display:flex;align-items:center;gap:10px;padding:9px 12px;font-size:13px;}
.sn-signflow-slots li+li{border-top:1px solid #e5e7eb;}
.sn-signflow-slots .lbl{flex:0 0 84px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#6b7280;}
.sn-signflow-slots .who{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;}
.sn-signflow-slots .st{flex:0 0 auto;font-size:12px;font-weight:700;color:#9ca3af;}
.sn-signflow-slots .st.ok{color:#059669;}
.sn-signflow-actions{display:flex;flex-direction:column;gap:8px;margin-top:16px;}
.sn-signflow-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1px solid #d1d5db;background:#fff;color:#111;border-radius:10px;padding:12px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;}
.sn-signflow-btn.primary{background:#059669;border-color:#059669;color:#fff;}
.sn-signflow-btn.quiet{border-color:transparent;color:#4b5563;}
.sn-signflow-btn:disabled{opacity:.6;cursor:progress;}
.sn-signflow-note{font-size:12px;color:#6b7280;line-height:1.5;margin:12px 0 0;}
.sn-signflow-btn.primary .pro-badge{background:rgba(255,255,255,.2)!important;border-color:rgba(255,255,255,.35)!important;color:#fff!important;}
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

    function formatAmount(tx) {
        const amount = Number(tx?.amount || 0);
        const currency = String(tx?.cash_box_currency_snapshot || tx?.cash_box?.currency || 'USD').toUpperCase();
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
        } catch (_) {
            return `${amount.toFixed(2)} ${currency}`;
        }
    }

    function companyName(tx, profile) {
        const snap = String(tx?.sender_company_name_snapshot || '').trim();
        if (snap) return snap;
        try {
            if (typeof window.spendnoteReceiptProfileDisplayName === 'function') {
                return String(window.spendnoteReceiptProfileDisplayName(profile) || '').trim();
            }
        } catch (_) {}
        return String(profile?.company_name || '').trim();
    }

    async function loadContext(transactionId) {
        const db = window.db;
        const [tx, profile, saved, signatures] = await Promise.all([
            db.transactions.getById(transactionId),
            db.profiles?.getCurrent?.().catch(() => null),
            db.signatures.getSaved().catch(() => null),
            db.signatures.listForTransaction(transactionId).catch(() => [])
        ]);
        if (!tx) return null;
        const mySide = String(tx.type || '').toLowerCase() === 'expense' ? 'from' : 'to';
        return {
            tx,
            mySide,
            myName: String(profile?.full_name || '').trim(),
            company: companyName(tx, profile),
            contact: String(tx.contact_name || tx.contact?.name || '').trim(),
            saved: saved && saved.signature_png ? saved : null,
            signatures: Array.isArray(signatures) ? signatures : []
        };
    }

    function slot(ctx, side) {
        const mine = side === ctx.mySide;
        return {
            side,
            mine,
            label: side === 'from' ? 'Issued by' : 'Received by',
            partyName: mine ? ctx.company : ctx.contact,
            signature: ctx.signatures.find((s) => s.side === side) || null
        };
    }

    function summaryHtml(ctx) {
        const from = slot(ctx, 'from').partyName;
        const to = slot(ctx, 'to').partyName;
        const desc = String(ctx.tx?.description || '').trim();
        return `
            <div class="amt">${esc(formatAmount(ctx.tx))}</div>
            <div>${esc(from || '—')} &rarr; ${esc(to || '—')}</div>
            ${desc ? `<div>${esc(desc)}</div>` : ''}`;
    }

    async function signSide(ctx, side, stepText) {
        const s = slot(ctx, side);
        if (s.signature) return;
        const sub = [stepText, s.mine && ctx.company ? `Signing for ${ctx.company}` : ''].filter(Boolean).join(' · ');
        const result = await window.SpendNoteSignaturePad.open({
            title: `${s.label}: ${s.mine ? 'your signature' : (s.partyName || 'contact')}`,
            subtitle: sub,
            summaryHtml: summaryHtml(ctx),
            defaultName: s.mine ? ctx.myName : s.partyName,
            nameLocked: s.mine && Boolean(ctx.myName),
            savedSignaturePng: s.mine && ctx.saved ? ctx.saved.signature_png : '',
            privacyNote: !s.mine && ctx.company ? `Your signature is stored with this receipt by ${ctx.company}.` : '',
            cancelLabel: 'Skip'
        });
        if (!result) return;

        const res = await window.db.signatures.create({
            transactionId: ctx.tx.id,
            party: s.mine ? 'workspace' : 'contact',
            method: result.method,
            signerName: result.name,
            signaturePng: result.png
        });
        if (res.success) {
            ctx.signatures = ctx.signatures.filter((x) => x.side !== res.data.side).concat(res.data);
            return;
        }
        if (typeof window.showAlert === 'function') {
            await window.showAlert(window.SpendNoteSignaturePad.errorMessage(res.code), { iconType: 'warning' });
        }
        if (res.code === 'SIGNATURE_ALREADY_SIGNED') {
            ctx.signatures = await window.db.signatures.listForTransaction(ctx.tx.id).catch(() => ctx.signatures);
        }
    }

    function canShareFiles() {
        try {
            if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
            const probe = new File([new Blob(['%PDF'], { type: 'application/pdf' })], 'receipt.pdf', { type: 'application/pdf' });
            return navigator.canShare({ files: [probe] });
        } catch (_) {
            return false;
        }
    }

    // Renders the PDF receipt in a hidden iframe and resolves with the file (or null).
    function preparePdf(url) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.tabIndex = -1;
            iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:1700px;opacity:0;pointer-events:none;border:0;';
            let done = false;
            const finish = (file) => {
                if (done) return;
                done = true;
                window.removeEventListener('message', onMessage);
                clearTimeout(timer);
                setTimeout(() => iframe.remove(), 0);
                resolve(file);
            };
            const onMessage = (ev) => {
                if (ev.origin !== window.location.origin || ev.source !== iframe.contentWindow) return;
                const data = ev.data || {};
                if (data.spendnote !== 'receiptPdf') return;
                if (data.error || !data.buffer) { finish(null); return; }
                const name = String(data.fileName || 'SpendNote_receipt.pdf');
                finish(new File([data.buffer], name, { type: 'application/pdf' }));
            };
            const timer = setTimeout(() => finish(null), PDF_TIMEOUT_MS);
            window.addEventListener('message', onMessage);
            iframe.src = url;
            document.body.appendChild(iframe);
        });
    }

    function downloadFile(file) {
        const href = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = href;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 60000);
    }

    async function canSendEmail() {
        try {
            return Boolean(await window.SpendNoteFeatures?.can?.('can_send_email_receipt'));
        } catch (_) {
            return false;
        }
    }

    async function contactEmail(tx) {
        const direct = String(tx?.contact_email || tx?.contact?.email || '').trim();
        if (direct || !tx?.contact_id || !window.db?.contacts?.getById) return direct;
        try {
            const c = await window.db.contacts.getById(tx.contact_id);
            return String(c?.email || '').trim();
        } catch (_) {
            return '';
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async function sendEmail(ctx, to, file) {
        let timeZone = '';
        try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
        const body = { transactionId: ctx.tx.id, to, timeZone, companyNameFallback: ctx.company };
        if (file) body.pdfAttachment = await fileToBase64(file);
        const { error } = await window.supabaseClient.functions.invoke('send-receipt-email', { body });
        if (!error) return;
        let detail = '';
        try {
            const payload = await error.context.json();
            detail = String(payload?.detail || '');
        } catch (_) {}
        throw new Error(detail || 'The email could not be sent. Please try again.');
    }

    function showEmailUpgrade() {
        const upgrade = window.SpendNoteUpgrade;
        if (!upgrade?.showEmailUpgrade) return;
        upgrade.showEmailUpgrade();
        const el = document.getElementById(upgrade._overlayId || 'sn-upgrade-overlay');
        if (el) el.style.zIndex = '10060';
    }

    async function writeBootstrap() {
        try {
            if (typeof window.writeBootstrapSession === 'function') await window.writeBootstrapSession();
        } catch (_) {}
    }

    async function showFinish(ctx, opts) {
        ensureStyle();
        const [canEmail, prefillEmail] = await Promise.all([canSendEmail(), contactEmail(ctx.tx)]);
        return new Promise((resolve) => {
            const from = slot(ctx, 'from');
            const to = slot(ctx, 'to');
            const count = [from, to].filter((s) => s.signature).length;
            const signed = count > 0;
            const touchFirst = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
            const shareFiles = canShareFiles();

            const title = count === 2 ? 'Receipt signed' : (count === 1 ? 'Receipt partly signed' : 'Receipt saved');
            const iconClass = count === 2 ? '' : (count === 1 ? ' partial' : ' none');
            const icon = count === 0 ? 'fa-receipt' : 'fa-signature';
            const shareLabel = shareFiles
                ? (signed ? 'Share signed receipt' : 'Share receipt')
                : (signed ? 'Download signed PDF' : 'Download PDF');
            const shareIcon = shareFiles ? 'fa-share-nodes' : 'fa-file-arrow-down';
            const slotRow = (s) => {
                const who = s.signature ? s.signature.signer_name : (s.partyName || (s.mine ? 'You' : 'Contact'));
                return `<li><span class="lbl">${esc(s.label)}</span><span class="who">${esc(who)}</span>`
                    + `<span class="st${s.signature ? ' ok' : ''}">${s.signature ? '<i class="fas fa-check"></i> Signed' : 'Not signed'}</span></li>`;
            };

            // Pro: getting the signed copy to the other party comes first. Otherwise touch shares, mouse prints.
            const primary = canEmail ? 'email' : (touchFirst ? 'share' : 'print');
            const emailLabel = signed ? 'Email signed copy' : 'Email receipt';
            const buttons = {
                email: `<button type="button" class="sn-signflow-btn${primary === 'email' ? ' primary' : ''}" data-act="email"><i class="fas fa-envelope"></i> ${esc(emailLabel)}${canEmail ? '' : ' <span class="pro-badge"><i class="fas fa-crown"></i> Pro</span>'}</button>`,
                share: `<button type="button" class="sn-signflow-btn${primary === 'share' ? ' primary' : ''}" data-act="share" disabled><i class="fas fa-spinner fa-spin"></i> Preparing PDF…</button>`,
                print: `<button type="button" class="sn-signflow-btn${primary === 'print' ? ' primary' : ''}" data-act="print"><i class="fas fa-print"></i> Print</button>`
            };
            const order = [primary].concat(['share', 'email', 'print'].filter((k) => k !== primary));

            const overlay = document.createElement('div');
            overlay.className = 'sn-signflow-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML = `
<div class="sn-signflow-card">
  <div class="sn-signflow-icon${iconClass}"><i class="fas ${icon}"></i></div>
  <h2 class="sn-signflow-title">${esc(title)}</h2>
  <div class="sn-signflow-sub">${esc(formatAmount(ctx.tx))} · ${esc(from.partyName || '—')} &rarr; ${esc(to.partyName || '—')}</div>
  <ul class="sn-signflow-slots">${slotRow(from)}${slotRow(to)}</ul>
  <div class="sn-signflow-actions">
    ${order.map((k) => buttons[k]).join('\n    ')}
    <button type="button" class="sn-signflow-btn quiet" data-act="close">Close</button>
  </div>
  <p class="sn-signflow-note">${signed ? 'Signatures are saved and can no longer be changed. ' : ''}You can open this receipt again later from the transaction list.</p>
</div>`;
            document.body.appendChild(overlay);

            const shareBtn = overlay.querySelector('[data-act="share"]');
            const shareReady = `<i class="fas ${shareIcon}"></i> ${esc(shareLabel)}`;
            let pdfFile = null;
            let pdfFailed = false;

            const pdfUrlPromise = Promise.resolve(opts.buildReceiptUrl('pdf', { deliver: 'parent' }));
            const pdfReady = writeBootstrap()
                .then(() => pdfUrlPromise)
                .then((url) => (url ? preparePdf(url) : null))
                .catch(() => null)
                .then((file) => {
                    pdfFile = file;
                    pdfFailed = !file;
                    shareBtn.disabled = false;
                    shareBtn.innerHTML = shareReady;
                    return file;
                });

            // Same steps and wording as the Email button on the transaction detail page.
            const emailBtn = overlay.querySelector('[data-act="email"]');
            let emailSending = false;
            const emailReceipt = async () => {
                if (!canEmail) { showEmailUpgrade(); return; }
                if (emailSending) return;
                const recipientEmail = await window.showPrompt('Send receipt to email address:', { defaultValue: prefillEmail, title: 'Email Receipt', iconType: 'prompt', placeholder: 'email@example.com' });
                if (recipientEmail === null) return;
                if (!recipientEmail.trim()) {
                    window.showAlert('Please enter an email address.', { iconType: 'warning' });
                    return;
                }
                const email = recipientEmail.trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    window.showAlert('Please enter a valid email address.', { iconType: 'warning' });
                    return;
                }
                const original = emailBtn.innerHTML;
                emailSending = true;
                emailBtn.disabled = true;
                emailBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                try {
                    await sendEmail(ctx, email, await pdfReady);
                    window.showAlert('Receipt sent successfully to ' + email, { iconType: 'success' });
                } catch (err) {
                    window.showAlert('Failed to send email: ' + (err?.message || 'Unknown error'), { iconType: 'error' });
                } finally {
                    emailSending = false;
                    emailBtn.disabled = false;
                    emailBtn.innerHTML = original;
                }
            };

            const close = () => {
                overlay.remove();
                resolve();
            };

            const openPrint = async () => {
                const placeholder = opts.receiptInSameTab ? null : window.open('about:blank', '_blank');
                await writeBootstrap();
                const url = await opts.buildReceiptUrl('receipt-print-two-copies', { autoPrint: '1' });
                if (!url) return;
                if (opts.receiptInSameTab) {
                    window.location.href = url;
                    return;
                }
                if (placeholder && !placeholder.closed) {
                    placeholder.location.href = url;
                } else if (!window.open(url, '_blank') && typeof window.showAlert === 'function') {
                    window.showAlert('Popup blocked. Please allow popups to print receipts.', { iconType: 'warning' });
                }
            };

            const share = async () => {
                if (pdfFailed || !pdfFile) {
                    // Fall back to the regular PDF page, which downloads the file itself.
                    const placeholder = opts.receiptInSameTab ? null : window.open('about:blank', '_blank');
                    const url = await opts.buildReceiptUrl('pdf', {});
                    if (!url) return;
                    if (opts.receiptInSameTab) window.location.href = url;
                    else if (placeholder && !placeholder.closed) placeholder.location.href = url;
                    else window.open(url, '_blank');
                    return;
                }
                if (shareFiles) {
                    try {
                        await navigator.share({ files: [pdfFile], title: pdfFile.name.replace(/\.pdf$/i, '') });
                    } catch (err) {
                        if (err && err.name === 'AbortError') return;
                        downloadFile(pdfFile);
                    }
                    return;
                }
                downloadFile(pdfFile);
            };

            overlay.addEventListener('click', (ev) => {
                const act = ev.target?.closest?.('[data-act]')?.getAttribute('data-act');
                if (act === 'close') close();
                else if (act === 'print') openPrint();
                else if (act === 'share') share();
                else if (act === 'email') emailReceipt();
            });
        });
    }

    async function run(opts) {
        const o = opts || {};
        if (!o.transactionId || !window.db?.signatures || !window.SpendNoteSignaturePad) return;
        const ctx = await loadContext(o.transactionId);
        if (!ctx) return;

        const order = [ctx.mySide, ctx.mySide === 'from' ? 'to' : 'from'];
        const pending = order.filter((side) => !slot(ctx, side).signature);
        for (let i = 0; i < pending.length; i++) {
            const stepText = pending.length > 1 ? `Step ${i + 1} of ${pending.length}` : '';
            await signSide(ctx, pending[i], stepText);
        }

        await showFinish(ctx, o);
    }

    window.SpendNoteSignFlow = { run, preparePdf, fileToBase64 };
})();
